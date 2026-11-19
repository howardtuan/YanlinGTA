// YanlinGTA 地圖原始資料：BOUNDS(minX=-820,maxX=1000,minZ=-900,maxZ=740) 換算後再外擴約 50 m
// 原點 24.9580,121.2425；KX=100918 m/deg, KZ=110574 m/deg
[out:json][timeout:180][bbox:24.9508,121.2339,24.9666,121.2529];
(
  // 建物（含 multipolygon relation 與 3D 分件）
  nwr["building"];
  nwr["building:part"];
  way["roof:shape"];
  // 道路、鐵路、人行區面
  way["highway"];
  way["area:highway"];
  way["railway"];
  // 面：土地使用 / 休閒 / 自然 / 水 / 停車  —— 注意 relation 也要抓
  nwr["landuse"];
  nwr["leisure"];
  nwr["natural"];          // 含 natural=tree / tree_row / wood / water / scrub
  nwr["waterway"];
  nwr["amenity"];          // POI + parking 面
  nwr["shop"];
  nwr["tourism"];
  nwr["historic"];
  nwr["man_made"];         // street_cabinet, water_tower, bridge...
  nwr["barrier"];          // wall / fence / hedge / gate / lift_gate
  nwr["power"];
  nwr["entrance"];
  // 街道家具點
  node["highway"];         // street_lamp, traffic_signals, crossing, bus_stop
  node["public_transport"];
);
out body geom;
