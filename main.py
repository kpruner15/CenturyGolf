import streamlit as st
import folium
from streamlit_folium import st_folium
from streamlit_js_eval import streamlit_js_eval
import math

# --- DATA ---
stats = {
    "5-Wood": {"avg": 218.5, "std_c": 2.5, "avg_off": 2.3, "std_off": 6.2},
    "4-Iron": {"avg": 179.8, "std_c": 9.6, "avg_off": 15.6, "std_off": 19.8},
    "5-Iron": {"avg": 169.6, "std_c": 2.8, "avg_off": 21.0, "std_off": 15.1},
    "7-Iron": {"avg": 151.0, "std_c": 1.8, "avg_off": 10.4, "std_off": 5.3},
    "10-Iron (PW)": {"avg": 123.0, "std_c": 1.6, "avg_off": 2.0, "std_off": 1.9},
    "LW": {"avg": 88.8,  "std_c": 2.6, "avg_off": 0.5,  "std_off": 1.2}
}

def haversine_distance(lat1, lon1, lat2, lon2):
    # Returns distance in yards
    R = 6371000 # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)) * R) * 1.09361

st.set_page_config(page_title="Takomo Live GPS", layout="wide")

# --- 1. GET USER LOCATION ---
st.sidebar.title("GPS Controls")
loc = streamlit_js_eval(data_key='pos', func_name='getCurrentPosition', component_value=None)

if loc:
    my_lat = loc['coords']['latitude']
    my_lon = loc['coords']['longitude']
    st.sidebar.success("GPS Signal Found")
else:
    # Default to a placeholder if GPS isn't ready
    my_lat, my_lon = 36.5662, -121.9465
    st.sidebar.warning("Waiting for GPS...")

# --- 2. TARGET LOGIC ---
if 'target' not in st.session_state:
    st.session_state.target = [my_lat + 0.001, my_lon] # Default target slightly ahead

# Calculate Distance
dist_to_target = haversine_distance(my_lat, my_lon, st.session_state.target[0], st.session_state.target[1])
st.metric("Distance to Target", f"{int(dist_to_target)} Yards")

# --- 3. CLUB SELECTION ---
club = st.selectbox("Select Club", list(stats.keys()))
s = stats[club]

# --- 4. MAP SETUP ---
m = folium.Map(location=st.session_state.target, zoom_start=18, tiles=None)
folium.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
                 attr='Esri', name='Satellite').add_to(m)

# User Marker (Blue Dot)
folium.CircleMarker([my_lat, my_lon], radius=7, color='blue', fill=True, popup="Me").add_to(m)

# Dispersion Bias
bias_lon = st.session_state.target[1] + (s['avg_off'] * 0.000009)

def get_ellipse_points(lat, lon, std_c, std_off, sigma):
    points = []
    lat_scale, lon_scale = 0.000009, 0.000009 / math.cos(math.radians(lat))
    for i in range(0, 361, 15):
        angle = math.radians(i)
        y, x = math.sin(angle) * (std_c * sigma) * lat_scale, math.cos(angle) * (std_off * sigma) * lon_scale
        points.append([lat + y, lon + x])
    return points

folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 2), color="yellow", fill=True, fill_opacity=0.2).add_to(m)
folium.Polygon(get_ellipse_points(st.session_state.target[0], bias_lon, s['std_c'], s['std_off'], 1), color="red", fill=True, fill_opacity=0.4).add_to(m)
folium.Marker(st.session_state.target, icon=folium.Icon(color='red', icon='flag')).add_to(m)

# Line from Me to Target
folium.PolyLine([[my_lat, my_lon], st.session_state.target], color="white", weight=2, dash_array='5, 5').add_to(m)

map_data = st_folium(m, width=700, height=500)
if map_data['last_clicked']:
    st.session_state.target = [map_data['last_clicked']['lat'], map_data['last_clicked']['lng']]
    st.rerun()
