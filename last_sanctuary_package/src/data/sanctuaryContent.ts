/** Authored compound content roster for LAST SANCTUARY. */
export type SanctuaryVehicleSpec = {
  id: string; name: string; class: 'car' | 'atv' | 'motorcycle' | 'tank' | 'military_enforcement'; drivable: boolean;
};

/** One reserved bay per vehicle; these are authored garage assets, never procedural spawns. */
export const APARTMENT_GARAGE_VEHICLES: readonly SanctuaryVehicleSpec[] = [
  { id: 'apt_car_01', name: 'Apartment Garage Car', class: 'car', drivable: true },
  { id: 'apt_atv_01', name: 'Apartment Garage ATV', class: 'atv', drivable: true },
  { id: 'apt_bike_01', name: 'Apartment Garage Motorcycle', class: 'motorcycle', drivable: true },
];

export const MILITARY_GARAGE_VEHICLES: readonly SanctuaryVehicleSpec[] = [
  { id: 'base_atv_01', name: 'Military Base ATV', class: 'atv', drivable: true },
  { id: 'base_tank_01', name: 'Military Base Tank', class: 'tank', drivable: true },
  { id: 'base_enforcement_01', name: 'Military Enforcement Vehicle', class: 'military_enforcement', drivable: true },
];

export type EdibleCropSpec = { id: string; name: string; category: 'vegetable' | 'fruit'; growDays: number; hungerRestore: number; yield: number };

/** Plantable, harvestable and edible compound crops. Hunger restoration is 0–100 points. */
export const SANCTUARY_CROPS: readonly EdibleCropSpec[] = [
  { id: 'tomato', name: 'Tomato', category: 'vegetable', growDays: 2, hungerRestore: 12, yield: 4 },
  { id: 'potato', name: 'Potato', category: 'vegetable', growDays: 3, hungerRestore: 18, yield: 5 },
  { id: 'carrot', name: 'Carrot', category: 'vegetable', growDays: 2, hungerRestore: 10, yield: 4 },
  { id: 'cabbage', name: 'Cabbage', category: 'vegetable', growDays: 4, hungerRestore: 22, yield: 3 },
  { id: 'corn', name: 'Corn', category: 'vegetable', growDays: 4, hungerRestore: 20, yield: 4 },
  { id: 'watermelon', name: 'Watermelon', category: 'fruit', growDays: 5, hungerRestore: 25, yield: 2 },
  { id: 'apple', name: 'Apple', category: 'fruit', growDays: 4, hungerRestore: 14, yield: 4 },
  { id: 'banana', name: 'Banana', category: 'fruit', growDays: 4, hungerRestore: 16, yield: 4 },
  { id: 'berry', name: 'Wild Berries', category: 'fruit', growDays: 2, hungerRestore: 8, yield: 5 },
];

/** Wildlife species that can provide food after a successful hunt and carcass harvest. */
export const HUNTABLE_FOOD_CATEGORIES = ['deer', 'boar', 'goat', 'buffalo', 'rabbit', 'duck', 'fish'] as const;
