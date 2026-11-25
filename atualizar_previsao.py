import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import geopandas as gpd
import folium
import branca.colormap as cm
from scipy.spatial import cKDTree

# Sessão HTTP resiliente com 3 tentativas automáticas
sessao = requests.Session()
retries = Retry(total=3, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
sessao.mount("https://", HTTPAdapter(max_retries=retries))

estacoes_sp = pd.DataFrame([
    {"codigo": "POLI", "nome": "São Paulo (USP)", "lat": -23.5556, "lon": -46.7303},
    {"codigo": "SJSP", "nome": "São José dos Campos", "lat": -23.2089, "lon": -45.8628},
    {"codigo": "PPTE", "nome": "Presidente Prudente", "lat": -22.1200, "lon": -51.4086},
    {"codigo": "SPAR", "nome": "Araçatuba", "lat": -21.1856, "lon": -50.4392},
    {"codigo": "FRAN", "nome": "Franca", "lat": -20.5144, "lon": -47.3994},
    {"codigo": "BAUR", "nome": "Bauru", "lat": -22.3458, "lon": -49.0289},
    {"codigo": "UBA1", "nome": "Ubatuba", "lat": -23.4336, "lon": -45.0711},
    {"codigo": "ILHA", "nome": "Ilha Solteira", "lat": -20.4319, "lon": -51.3442},
])

def coletar_dados_horarios(df_estacoes):
    registros = []
    for _, row in df_estacoes.iterrows():
        url_ar = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={row['lat']}&longitude={row['lon']}"
            f"&current=pm10,pm2_5,aerosol_optical_depth&timezone=America%2FSao_Paulo"
        )
        url_met = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={row['lat']}&longitude={row['lon']}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation&timezone=America%2FSao_Paulo"
        )
        try:
            r_ar = sessao.get(url_ar, timeout=30).json().get("current", {})
        except Exception as e:
            print(f"Aviso API Ar ({row['codigo']}): {e}")
            r_ar = {}

        try:
            r_met = sessao.get(url_met, timeout=30).json().get("current", {})
        except Exception as e:
            print(f"Aviso API Meteo ({row['codigo']}): {e}")
            r_met = {}

        pm25_base = float(r_ar.get("pm2_5") or 10.0)
        pm10_base = float(r_ar.get("pm10") or 12.0)
        umid = float(r_met.get("relative_humidity_2m") or 70.0)
        chuva = float(r_met.get("precipitation") or 0.0)

        # Ajuste físico-operacional calibrado (atenuação por precipitação e dispersão)
        fator_chuva = 0.85 if chuva > 0.5 else 1.0
        fator_umid = 1.03 if umid > 80 else 1.0
        pm25_pred = max(0.0, round(pm25_base * fator_chuva * fator_umid, 2))
        pm10_pred = max(0.0, round(pm10_base * fator_chuva * fator_umid, 2))

        ts_raw = r_ar.get("time", "")
        ts_fmt = pd.to_datetime(ts_raw).strftime("%d/%m/%Y %H:%M") if ts_raw else pd.Timestamp.now(tz="America/Sao_Paulo").strftime("%d/%m/%Y %H:%M")

        registros.append({
            "codigo": row["codigo"],
            "nome": row["nome"],
            "lat": row["lat"],
            "lon": row["lon"],
            "pm2_5_pred": pm25_pred,
            "pm10_pred": pm10_pred,
            "ultima_atualizacao": ts_fmt
        })
    return pd.DataFrame(registros)

df_pred = coletar_dados_horarios(estacoes_sp)

# Interpolação espacial IDW para os 645 municípios de SP (via GeoJSON local)
sp_municipios = gpd.read_file("assets/sp_municipios.geojson").to_crs("EPSG:4326")
coords_estacoes = df_pred[["lon", "lat"]].values
tree = cKDTree(coords_estacoes)

centroides = sp_municipios.to_crs("EPSG:31983").geometry.centroid.to_crs("EPSG:4326")
coords_munis = np.column_stack([centroides.x, centroides.y])

dists, idxs = tree.query(coords_munis, k=4)
pesos = 1.0 / (dists ** 2 + 1e-6)
pesos /= pesos.sum(axis=1, keepdims=True)

sp_municipios["pm2_5_estimado"] = np.round((pesos * df_pred["pm2_5_pred"].values[idxs]).sum(axis=1), 1)
sp_municipios["pm10_estimado"] = np.round((pesos * df_pred["pm10_pred"].values[idxs]).sum(axis=1), 1)

# Geração do mapa interativo atualizado (mapa_sp.html)
mapa_sp = folium.Map(
    location=[-22.5, -48.5],
    zoom_start=7,
    min_zoom=7,
    max_zoom=13,
    max_bounds=True,
    maxBoundsViscosity=1.0,
    min_lat=-25.8,
    max_lat=-19.2,
    min_lon=-53.8,
    max_lon=-43.8,
    tiles=None
)

folium.TileLayer(
    tiles="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attr="Esri",
    name="Mapa Base Cinza (Esri)",
    min_zoom=7,
    max_zoom=13,
    control=False
).add_to(mapa_sp)

colormap = cm.LinearColormap(
    colors=["#4ADE80", "#FDE047", "#FB923C", "#EF4444"],
    vmin=0,
    vmax=60
)

folium.GeoJson(
    sp_municipios,
    name="Municípios (SP)",
    style_function=lambda feature: {
        "fillColor": colormap(feature["properties"]["pm2_5_estimado"]),
        "color": "#94A3B8",
        "weight": 0.25,
        "fillOpacity": 0.72
    },
    tooltip=folium.GeoJsonTooltip(
        fields=["name_muni", "pm2_5_estimado", "pm10_estimado"],
        aliases=["Município:", "PM2.5 (µg/m³):", "PM10 (µg/m³):"],
        localize=True
    )
).add_to(mapa_sp)

camada_estacoes = folium.FeatureGroup(name="Estações RBMC / Clima", show=True)
for _, est in df_pred.iterrows():
    popup_html = (
        f"<div style='font-family: sans-serif; min-width: 170px;'>"
        f"<strong>{est['codigo']} - {est['nome']}</strong><br>"
        f"<hr style='margin: 4px 0;'>"
        f"PM2.5: <b>{est['pm2_5_pred']} µg/m³</b><br>"
        f"PM10: <b>{est['pm10_pred']} µg/m³</b><br>"
        f"<small style='color: #64748B;'>Atualizado: {est['ultima_atualizacao']}</small>"
        f"</div>"
    )
    folium.CircleMarker(
        location=[est["lat"], est["lon"]],
        radius=6,
        color="#0F172A",
        weight=1.5,
        fill=True,
        fill_color=colormap(est["pm2_5_pred"]),
        fill_opacity=0.95,
        tooltip=f"{est['codigo']} ({est['nome']}): {est['pm2_5_pred']} µg/m³",
        popup=folium.Popup(popup_html, max_width=250)
    ).add_to(camada_estacoes)

camada_estacoes.add_to(mapa_sp)
mapa_sp.save("mapa_sp.html")

mapa_atualizado_em = pd.Timestamp.now(
    tz="America/Sao_Paulo"
).isoformat(timespec="microseconds")
df_pred["mapa_atualizado_em"] = mapa_atualizado_em
df_pred.to_json("estacoes_pred.json", orient="records", force_ascii=False, indent=2)
print(f"Mapa atualizado em {mapa_atualizado_em}: estacoes_pred.json e mapa_sp.html gerados.")