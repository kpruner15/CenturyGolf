import streamlit as st
import folium
from streamlit_folium import st_folium
import math

# --- 1. THE COMPLETE TAKOMO + 5W LIBRARY ---
# Data digitized from all your session uploads
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "6-Iron": {"avg": 160.3, "std_c": 2.5, "avg_off": 12.0, "std_off": 5.8},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "8-Iron": {"avg": 140.0, "std_c": 1.5, "avg_off": 3.4,  "std_off": 3.6},
    "9-Iron": {"avg": 129.5, "std_c": 1.7, "avg_off": 2.4,  "std_off": 1.9},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "GW": {"avg": 116.0, "std_c": 1.4, "avg_off": 1.6,  "std_off": 2.1},
    "SW": {"avg": 102.8, "std_c": 1.8, "avg_off": 1.0,  "std_off": 1.5},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5,  "std_off": 1.2}
}

st.set_page_config(page_title="Takomo Strategy Map", layout="wide")

# --- 2. THE INTERFACE ---
st.title("🎯 Takomo Shot Mapper")
st.sidebar.header("Bag Selection")
club = st.sidebar.selectbox("Select Club", list(stats.keys()))
s = stats[club]

st.sidebar.metric("Avg Carry", f"{s['avg']} yds")
st.sidebar.metric("Typical Miss", f"{s['avg_off']} yds Right")

# --- 3. THE MAP ENGINE ---
if 'target' not in st.session_state:
    st.session_state.target = [36.5662, -121.9465] # Default Target

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

m = folium.Map(location=st.session_state.target, zoom_start=19)
folium.TileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
    attr='Esri', name='Satellite'
).add_to(m)

# Bias-Adjusted Center (Where the ball actually tends to go)
bias_lon = st.session_state.target[1] + (s['avg_off'] * 0.000009)

# Layer the Polygons (Yellow = 95%, Red = 68%)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 2),
               color="yellow", weight=1, fill=True, fill_opacity=0.2).add_to(m)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 1),
               color="red", weight=2, fill=True, fill_opacity=0.4).add_to(m)
folium.Marker(st.session_state.target, popup="Aim Point").add_to(m)

# --- 4. THE INTERACTIVITY ---
st.write("Click anywhere on the map to change your aim point!")
map_data = st_folium(m, width=800, height=600)

if map_data['last_clicked']:
    st.session_state.target = [map_data['last_clicked']['lat'], map_data['last_clicked']['lng']]
    st.rerun()