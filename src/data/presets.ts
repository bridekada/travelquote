export const ITINERARY_PRESETS = {
  'Arrival + Dahilayan (Bukidnon)': { 
    text: "• Airport pick-up\n• Pineapple Plantation\n• Dahilayan Adventure Park\n• Dahilayan Forest Park\n• Alpine Village\n• Try: Pineapple Ice Cream", 
    km: 186, 
    area: 'Region X' 
  },
  'Impasugong Tour': { 
    text: "• Paminahawa Ridge\n• Communal Ranch\n• Lover’s Lane\n• Roty Peaks\n• Cedar (forest area)", 
    km: 200, 
    area: 'Region X' 
  },
  'Camiguin Tour': { 
    text: "• White Island\n• Mantigue Island\n• Tuasan Falls\n• Soda Water Pool", 
    km: 220, 
    area: 'Region X' 
  },
  'Camiguin Land Tour': { 
    text: "• Old Spanish Church Ruins\n• Sunken Cemetery\n• Walkway to Old Volcano\n• Ardent Hot Spring", 
    km: 220, 
    area: 'Region X' 
  },
  'CDO Tour': { 
    text: "• White Water Rafting / Paragliding (optional)\n• Amaya View\n• Divine Mercy Shrine\n• Pasalubong Center", 
    km: 150, 
    area: 'City Drive' 
  },
  'Airport Drop-off': { 
    text: "• Airport drop-off\n• Stop by Pasalubong Center", 
    km: 150, 
    area: 'City Drive' 
  }
};

export const AREA_DEFAULTS = {
  'City Drive': { driverFee: 800, driverMeals: 450, driverAcc: 0 },
  'Region X': { driverFee: 1000, driverMeals: 450, driverAcc: 1000 },
  'Outside Region': { driverFee: 1500, driverMeals: 450, driverAcc: 1000 }
};

export const VEHICLE_DEFAULTS: Record<string, any> = {
  'Innova': { rate: { 'City Drive': 2500, 'Region X': 2800, 'Outside Region': 3600 }, kml: 10, carwash: 300 },
  'Avanza': { rate: { 'City Drive': 2200, 'Region X': 2500, 'Outside Region': 3200 }, kml: 10, carwash: 250 },
  'Hiace': { rate: { 'City Drive': 3000, 'Region X': 3500, 'Outside Region': 4000 }, kml: 10, carwash: 400 },
  'Fortuner': { rate: { 'City Drive': 3000, 'Region X': 3500, 'Outside Region': 4000 }, kml: 10, carwash: 300 },
};
