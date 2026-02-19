import streamlit as st
import folium
from streamlit_folium import st_folium
import math

# --- 1. DATA REMAINS THE SAME ---
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5,  "std_off": 1.2}
}

st.set_page_config(page_title="Takomo Pro GPS", layout="wide")

# --- 2. THE NEW MOBILE INTERFACE ---
st.title("⛳ Takomo Pro Caddie")
club = st.selectbox("Select Club", list(stats.keys()))
s = stats[club]

# Set a Default Location (Use your GPS or a dummy value)
if 'target' not in st.session_state:
    st.session_state.target = [36.5662, -121.9465]

# --- 3. DYNAMIC ZOOM LOGIC ---
# For now, let's assume a dummy 'Ball Position' 200 yards back
# We'll toggle this zoom based on the club's average distance
if s['avg'] > 200:
    current_zoom = 17  # Fairway view
else:
    current_zoom = 19  # Green view

# --- 4. THE SATELLITE ENGINE ---
# Create map WITHOUT the default OpenStreetMap background
m = folium.Map(
    location=st.session_state.target, 
    zoom_start=current_zoom,
    tiles=None # This removes the street view
)

# Add ONLY high-res satellite
folium.TileLayer(
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr='Esri World Imagery',
    name='Satellite',
    overlay=False,
    control=False
).add_to(m)

# --- 5. DISPERSION DRAWING ---
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

# Draw Yellow (GIR) and Red (Birdie)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 2),
               color="yellow", weight=1, fill=True, fill_opacity=0.2).add_to(m)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 1),
               color="red", weight=2, fill=True, fill_opacity=0.4).add_to(m)
folium.Marker(st.session_state.target, popup="Aim Point").add_to(m)

# Render
map_data = st_folium(m, width=700, height=500)

if map_data['last_clicked']:
    st.session_state.target = [map_data['last_clicked']['lat'], map_data['last_clicked']['lng']]
    st.rerun()
