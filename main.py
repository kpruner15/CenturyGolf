import streamlit as st
import folium
from streamlit_folium import st_folium
import math

# --- 1. FULL DATA RESTORED ---
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "6-Iron": {"avg": 160.2, "std_c": 2.4, "avg_off": 12.5, "std_off": 8.4},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "8-Iron": {"avg": 141.5, "std_c": 2.1, "avg_off": 8.2,  "std_off": 4.1},
    "9-Iron": {"avg": 132.0, "std_c": 1.9, "avg_off": 5.1,  "std_off": 3.2},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "GW": {"avg": 112.5, "std_c": 2.2, "avg_off": 1.5, "std_off": 1.8},
    "SW": {"avg": 101.0, "std_c": 2.5, "avg_off": 0.8, "std_off": 1.5},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5, "std_off": 1.2}
}

st.set_page_config(page_title="CenturyGolf Strategy", layout="wide")

# --- 2. THE CENTURYGOLF SIDEBAR ---
with st.sidebar:
    st.title("🏆 CenturyGolf")
    st.subheader("Elite Strategy Interface")
    club = st.selectbox("Current Club Selection", list(stats.keys()))
    s = stats[club]
    
    st.markdown("---")
    st.metric(label=f"{club} Carry", value=f"{s['avg']}y")
    bias_text = "Right" if s['avg_off'] > 0 else "Left"
    st.metric(label="Lateral Bias", value=f"{abs(s['avg_off'])}y {bias_text}")

# --- 3. TARGETING LOGIC ---
if 'target' not in st.session_state:
    st.session_state.target = [36.5662, -121.9465] # Default to Pebble

# --- 4. SATELLITE ENGINE ---
zoom_level = 17 if s['avg'] > 180 else 19

m = folium.Map(location=st.session_state.target, zoom_start=zoom_level, tiles=None)
folium.TileLayer(
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr='Esri Satellite',
    name='CenturyGolf Satellite'
).add_to(m)

# Dispersion Calculation
bias_lon = st.session_state.target[1] + (s['avg_off'] * 0.000009)

def get_ellipse_points(lat, lon, std_c, std_off, sigma):
    points = []
    lat_scale = 0.000009 
    lon_scale = 0.000009 / math.cos(math.radians(lat))
    for i in range(0, 361, 15):
        angle = math.radians(i)
        y = math.sin(angle) * (std_c * sigma) * lat_scale
        x = math.cos(angle) * (std_off * sigma) * lon_scale
        points.append([lat + y, lon + x])
    return points

# Draw Tactical Zones
# Yellow = 95% Confidence (2 Sigma), Red = 68% Confidence (1 Sigma)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 2),
               color="yellow", weight=1, fill=True, fill_opacity=0.15).add_to(m)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 1),
               color="red", weight=2, fill=True, fill_opacity=0.35).add_to(m)

folium.Marker(st.session_state.target, icon=folium.Icon(color='darkred', icon='crosshairs', prefix='fa')).add_to(m)

# --- 5. RENDER ---
st.write(f"### CenturyGolf Target View: {club}")
map_data = st_folium(m, width=800, height=600)

if map_data['last_clicked']:
    st.session_state.target = [map_data['last_clicked']['lat'], map_data['last_clicked']['lng']]
    st.rerun()
