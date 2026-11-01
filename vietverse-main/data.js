const provinceData = {
  VN01: { name: "Lai Châu", description: "Giữ nguyên", population: "494626", area: "9068,7", url: "default", color: "#19d23eff"},
  VN04: { name: "Cao Bằng", description: "Giữ nguyên", population: "555809", area: "6700,4", url: "default", color: "#f94144ff" },
  VN05: { name: "Sơn La", description: "Giữ nguyên", population: "1327430", area: "14109,8", url: "default", color: "#f3722cff" },
  VN09: { name: "Lạng Sơn", description: "Giữ nguyên", population: "813978", area: "8310,2", url: "default", color: "#f8961eff"},
  VN13: { name: "Quảng Ninh", description: "Giữ nguyên", population: "1429841", area: "6207,9", url: "default", color: "#f9844aff"},
  VN21: { name: "Thanh Hóa", description: "Giữ nguyên", population: "3760650", area: "11114,7", url: "default", color: "#f9c74fff"},
  VN22: { name: "Nghệ An", description: "Giữ nguyên", population: "3470988", area: "16493,7", url: "default", color: "#90be6dff"},
  VN23: { name: "Hà Tĩnh", description: "Giữ nguyên", population: "1622901", area: "5994,4", url: "default", color: "#43aa8bff"},
  VN26: { name: "TP Huế", description: "Giữ nguyên", population: "1236393", area: "4947,1", url: "default", color: "#4d908eff"},
  VN71: { name: "Điện Biên", description: "Giữ nguyên", population: "653422", area: "9539,9", url: "default", color: "#577590ff"},
  VNHN: { name: "TP Hà Nội", description: "Giữ nguyên", population: "8718000", area: "3359,8", url: "default", color: "#ca2929ff"},
  HY_TB: { name: "Hưng Yên", description: "Hưng Yên + Thái Bình", population: "3567943", area: "2514,81", url: "default", color: "#ff6b6bff"},
  BN_BG: { name: "Bắc Ninh", description: "Bắc Ninh + Bắc Giang", population: "3619433", area: "4718,6", url: "default", color: "#ffa07aff"},
  HP_HD: { name: "TP Hải Phòng", description: "TP Hải Phòng + Hải Dương", population: "4664124", area: "3194,72", url: "default", color: "#ffd166ff"},
  TN_BK: { name: "Thái Nguyên", description: "Thái Nguyên + Bắc Kạn", population: "1799489", area: "8375,21", url: "default", color: "#06d6a0ff"},
  PT_VP_HB: { name: "Phú Thọ", description: "Phú Thọ + Vĩnh Phúc + Hòa Bình", population: "4022638", area: "9361,38", url: "default", color: "#118ab2ff"},
  NB_NĐ_HN: { name: "Ninh Bình", description: "Ninh Bình + Nam Định + Hà Nam", population: "4412264", area: "3942,62", url: "default", color: "#073b4cff"},
  NB_NĐ_HN: { name: "Ninh Bình", description: "Ninh Bình + Nam Định + Hà Nam", population: "4412264", area: "3942,62", url: "default", color: "#ffb5a7ff"},
  LC_YB: { name: "Lào Cai", description: "Lào Cai + Yên Bái", population: "1778785", area: "13256,92", url: "default", color: "#fcd5ceff"},
  TQ_HG: { name: "Tuyên Quang", description: "Tuyên Quang + Hà Giang", population: "1865270", area: "13795,5", url: "default", color: "#f8edebff"},
  QT_QB: { name: "Quảng Trị", description: "Quảng Trị + Quảng Bình", population: "1870845", area: "12700,0", url: "default", color: "#d8e2dcff"},
  ĐN_QN: { name: "TP Đà Nẵng", description: "Đà Nẵng + Quảng Nam", population: "3065628", area: "11859,59", url: "default", color: "#a2d2ffff"},
  QN_KT: { name: "Quảng Ngãi", description: "Quảng Ngãi + Kon Tum", population: "2161755", area: "14832,55", url: "default", color: "#bde0feff"},
  GL_BĐ: { name: "Gia Lai", description: "Gia Lai + Bình Định", population: "3583693", area: "21576,53", url: "default", color: "#cdb4dbff"},
  ĐL_PY: { name: "Đắk Lắk", description: "Đắk Lắk + Phú Yên", population: "3346853", area: "18096,4", url: "default", color: "#ffc8ddff"},
  KH_NT: { name: "Khánh Hòa", description: "Khánh Hòa + Ninh Thuận", population: "2243554", area: "8555,86", url: "default", color: "#ffafccff"},
  LĐ_ĐN_BT: { name: "Lâm Đồng", description: "Lâm Đồng + Đắk Nông + Bình Thuận", population: "3872999", area: "24233,07", url: "default", color: "#ffffbfff"},
  ĐN_BP: { name: "Đồng Nai", description: "Đồng Nai + Bình Phước", population: "4491408", area: "12737,18", url: "default", color: "#caffbfff"},
  TN_LA: { name: "Tây Ninh", description: "Tây Ninh + Long An", population: "3254170", area: "8536,44", url: "default", color: "#9bf6ffff"},
  HCM_BRVT_BD: { name: "TP Hồ Chí Minh", description: "TP Hồ Chí Minh + Bà Rịa-Vũng Tàu + Bình Dương", population: "14002598", area: "6772,59", url: "default", color: "#a0c4ffff"},
  ĐT_TG: { name: "Đồng Tháp", description: "Đồng Tháp + Tiền Giang", population: "4370046", area: "5938,64", url: "default", color: "#bdb2ffff"},
  AN_KG: { name: "An Giang", description: "An Giang + Kiên Giang", population: "4952238", area: "9888,91", url: "default", color: "#ffc6ffff"},
  VL_BT_TV: { name: "Vĩnh Long", description: "Vĩnh Long + Bến Tre + Trà Vinh", population: "4257581", area: "6296,2", url: "default", color: "#ffadadff"},
  CM_BL: { name: "Cà Mau", description: "Cà Mau + Bạc Liêu", population: "2606672", area: "7942,39", url: "default", color: "#ffd6a5ff"},
  CT_ST_HG: { name: "TP Cần Thơ", description: "Cần Thơ + Sóc Trăng + Hậu Giang", population: "4199824", area: "6360,83", url: "default", color: "#cafffbff"},
  PQ: { "name": "Đảo Phú Quốc", "description": "Thuộc tỉnh Kiên Giang","population": "179480","area": "574", "url": "default", color: "#b9fbc0ff"},
  QĐTS: {
  "name": "Quần đảo Trường Sa",
  "description": "Gồm nhiều đảo, đá và bãi san hô thuộc tỉnh Khánh Hòa, Việt Nam",
  "population": "Không cố định (chủ yếu là lực lượng đóng quân)",
  "area": "160000", 
  "url": "default",
  color: "#cd0d0dff"
},
  QĐHS: {
  "name": "Quần đảo Hoàng Sa",
  "description": "Gồm nhiều đảo nhỏ và bãi đá, thuộc thành phố Đà Nẵng, Việt Nam",
  "population": "Không cố định (chủ yếu là lực lượng đóng quân)",
  "area": "30500", 
  "url": "default",
  color: "#cd0d0dff"
}
};
paths.forEach((path) => {
  path.addEventListener("click", function () {
    const id = this.id;
    const province = provinceData[id];
    if (province) {
      showModal(province);
    }
  });
});
