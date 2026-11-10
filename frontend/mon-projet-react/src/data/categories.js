const RATES_INCLUDE = [
  'Civil liability and third party liability insurance',
  'Full insurance C.D.W. (with relevant deductible)',
  'Theft and fire insurance',
  'Unlimited Mileage for rentals 3 days+. (One and Two days rentals are with limited to 200 kilometers per day)',
  'Free additional drivers',
  'Free and Pre-Authorized Permission to Ferry our Vehicles to all Greek Islands',
  '24Hrs road assistance',
  'Vehicle Registration Fee (V.R.F.) & VAT 24%',
]

const PRICE_NOTE = 'Our rates are in Euro, all inclusive and with no "Hidden Extras"'

const categoryFilterSlugs = {
  standard: ['category-b-manual', 'category-c-manual', 'category-d-manual', 'category-d1-manual', 'category-d3-manual'],
  automatic: ['category-e-automatic', 'category-e1-automatic', 'category-e2-automatic', 'category-e3-automatic', 'category-g-automatic', 'category-g1-automatic'],
  minivans: ['category-f-manual', 'category-f1-manual', 'category-v-manual-small-van', 'category-v1-manual-large-van'],
  minivanAutomatic: ['category-f2-automatic', 'category-f3-automatic', 'category-f4-automatic', 'category-f5-automatic', 'category-g2-automatic', 'category-diesel-l5-automatic'],
  suv: ['category-d-manual', 'category-d3-manual', 'category-g-automatic', 'category-g1-automatic', 'category-l1-luxury-automatic', 'category-l2-luxury-automatic'],
  luxury: ['category-l1-luxury-automatic', 'category-l2-luxury-automatic'],
}

const categoryData = [
  {
    slug: 'category-b-manual',
    name: 'Category B Manual',
    type: 'Manual',
    carId: 11,
    example: 'Fiat Panda or similar',
    description: 'Practical and economical cars, that can be easily driven anywhere in Athens and are also a pleasure to drive on highways. Reliable standard cars for city usage and middle distance excursions. Offer excellent fuel saving. Vehicles of Category B (Fiat Panda or similar) will never let you down, guaranteeing a pleasant holiday in Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '4', airBag: 'Yes', luggage: '220L to 250L', fuel: 'Unleaded 95', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-c-manual',
    name: 'Category C Manual',
    type: 'Manual',
    carId: 10,
    example: 'Dacia Sandero, Suzuki Swift or similar',
    description: 'Vehicles of Category C (Dacia Sandero, Suzuki Swift or similar) are practical, comfortable, spacious and economical. They offer safety and stability during your vacation in Greece, can be easily driven anywhere in Athens and are also a pleasure to drive on highways. They are environmentally friendly and very fuel efficient cars. For that reasons Vehicles of Category C are your best choice for economy touring all around Greece. Vehicles of Category C will never let you down, guaranteeing a pleasant holiday in Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '270 to 330L', fuel: 'Unleaded or Diesel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-d-manual',
    name: 'Category D Manual',
    type: 'Manual',
    carId: 12,
    example: 'Seat Arona, VW T-Cross or similar',
    description: 'Elegant cars for families or groups of friends of five persons, which provide top class performance, comfort and safety. The Vehicles of Category D (Seat Arona, VW T-Cross or similar) are comfortable cars that offer safety and stability during your vacation in Greece. They are environmentally friendly and very fuel efficient cars. For that reasons Vehicles of Category D are your best choice for economy touring all around Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '360 to 390L', fuel: 'Unleaded 95 Fuel', doors: '4', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-d1-manual',
    name: 'Category D1 Manual',
    type: 'Manual',
    carId: 14,
    example: 'Skoda Scala or similar',
    description: 'Vehicles of Category D1 (Skoda Scala or Similar) are cars in which you can depend on. They are comfortable and safe with thoughtful ergonomic design. Enhancing both comfort and style, everything is intuitively just where the driver wants it. You can enjoy a feeling of a safe ride and the spaciousness of the cabin. Vehicles of Category D1 are stylish cars for families or groups of friends of five persons. They are a great choice for unforgettable vacations in Greece.',
    specs: { seats: '5', airBag: 'Yes', luggage: '500L', fuel: 'Unleaded or Diesel', doors: '4 or 5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-e-automatic',
    name: 'Category E Automatic',
    type: 'Automatic',
    carId: 17,
    example: 'Opel Corsa, Seat Ibiza or similar',
    description: 'Vehicles of Category E (Opel Corsa, Seat Ibiza or Similar) drive easily and simply. The Vehicles of Category E are cars with renewed design. The automatic gearbox gives you the comfort you are looking for urban roads. They are flexible and economic cars, which will surely live up to your driving demands within the city.',
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '270 to 330L', fuel: 'Unleaded 95 Fuel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-e1-automatic',
    name: 'Category E1 Automatic',
    type: 'Automatic',
    carId: 18,
    example: 'Seat Arona, Kia Stonic or similar',
    description: "Style, safety and comfort are the characteristics of the Vehicles of Category E1 (Seat Arona, Kia Stonic or Similar). They are excellent cars for your holiday travels with spacious luggage areas. Whether it's a weekend, a small family holiday or a great adventure, the Vehicles of Category E1 offer comfortable and safe journeys. Enjoy unforgettable holidays in Greece with your family or friends, driving these top class automatic cars.",
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '370 to 400L', fuel: 'Unleaded 95 Fuel', doors: '4D or 5D depending', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-e2-automatic',
    name: 'Category E2 Automatic',
    type: 'Automatic',
    carId: 20,
    example: 'Skoda Scala Automatic or similar',
    description: 'These automatic vehicles of Category E2 (Skoda Scala Automatic or Similar) are comfortable and safe with thoughtful ergonomic design. Enhancing both comfort and style, everything is intuitively just where the driver wants it. You can enjoy a feeling of a safe ride and the spaciousness of the cabin. Vehicles of Category E2 is a great option for families or groups of friends of five persons.',
    specs: { seats: '5', airBag: 'Yes', luggage: '500L', fuel: 'Unleaded 95 Fuel', doors: '4D or 5D', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-e3-automatic',
    name: 'Category E3 Automatic',
    type: 'Automatic',
    carId: 23,
    example: 'Toyota Corolla TS StationWagon or similar',
    description: 'Vehicles of Category E3 (Toyota Corolla TS StationWagon or similar) are comfortable cars for families or groups of friends of five persons, which provide top class performance, comfort and safety. The Vehicles of Category E3 are the best choice for unforgettable vacations in Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '600L', fuel: 'Unleaded 95 Fuel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-d3-manual',
    name: 'Category D3 Manual',
    type: 'Manual',
    carId: 33,
    example: 'Skoda Kamiq, Suzuki Vitara or similar',
    description: 'Vehicles of Category D3 (Skoda Kamiq, Suzuki Vitara or Similar) are cars in which you can depend on. They are comfortable and safe with thoughtful ergonomic design. Enhancing both comfort and style, everything is intuitively just where the driver wants it. You can enjoy a feeling of a safe ride and the spaciousness of the cabin. Vehicles of Category D3 are stylish cars for families or groups of friends of five persons. They are a great choice for unforgettable vacations in Greece.',
    specs: { seats: '5', airBag: 'Yes', luggage: '400 to 420L', fuel: 'Unleaded 95 Fuel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-g-automatic',
    name: 'Category G Automatic',
    type: 'Automatic',
    carId: 28,
    example: 'VW Taigo, Skoda Kamiq or similar',
    description: 'The Automatic Vehicles of Category G (VW Taigo, Skoda Kamiq or similar) are SUV jeeps that exceed your expectations. They are reliable, strong and offer top-notch practicality. Their boot is big and the automatic gearbox gives you the comfort you are looking for urban roads.',
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '400 to 420L', fuel: 'Unleaded 95 Fuel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-g1-automatic',
    name: 'Category G1 Automatic',
    type: 'Automatic',
    carId: 29,
    example: 'Nissan Qashqai, Dacia Duster, Leapmotor C10 or similar',
    description: 'Vehicles of Category G1 (Nissan Qashqai, Dacia Duster, Leapmotor C10 or similar) has everything you can ask from an SUV vehicle. The Vehicles of Category G1 with outstanding capability and smart technology, all in city-friendly package. Meet the next generation of crossover design, merging SUV styling and compact hatchback refinement with advanced in-car connectivity. Their raised position give you fantastic visibility, making you the ruler of the road and the city. The Vehicles of Category G1 are the definition of no compromise.',
    specs: { seats: '5', airBag: 'Yes', luggage: '500 to 550L', fuel: 'Unleaded 95 Fuel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-g2-automatic',
    name: 'Category G2 - 7 Seats (5+2) Automatic',
    type: 'Automatic',
    carId: 31,
    example: 'Skoda Kodiaq, VW Tiguan or similar',
    description: 'The Vehicles of Category G2 (Skoda Kodiaq, VW Tiguan or similar) 7 Seats (5+2) are the ultimate SUV for an adventurous vacation. They offer drivers total control and ease, guaranteeing safety and comfort while traveling over all around Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '7 (5+2)', airBag: 'Yes', luggage: '300 or 750L', fuel: 'Unleaded or Diesel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-f-manual',
    name: 'Category F - 7 Seats Manual',
    type: 'Manual',
    carId: 22,
    example: 'Toyota Proace or similar, 7 seats',
    description: "At first, you'll wonder if the Vehicles of Category F (Toyota Proace or similar 7 Seats) are cars or minivans. In reality, they are a combination of the best features of both of them. They offer luxurious driving, allowing you to make the most of your travels in Greece.",
    specs: { seats: '7', airBag: 'Yes', luggage: '350 or 800L', fuel: 'Unleaded or Diesel', doors: '4', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-f2-automatic',
    name: 'Category F2 - 7 Seats Automatic',
    type: 'Automatic',
    carId: 26,
    example: 'Toyota Proace Automatic or similar, 7 seats',
    description: 'Category F2 Vehicles (Toyota Proace Automatic or similar – 7 Seats) have high quality interior design and comfortable passenger cabin. Category F2 Vehicles with their impressive cutting edge technology engine offer fuel economy and are ideal for both long and short distances throughout Athens Region and Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '7', airBag: 'Yes', luggage: '320 or 800L', fuel: 'Unleaded', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-f3-automatic',
    name: 'Category F3 - 7 Seats Automatic',
    type: 'Automatic',
    carId: 38,
    example: 'VW Caddy Maxi 7 Seats Auto or similar',
    description: 'Category F3 Vehicles (VW Caddy Maxi 7 Seats Auto or similar) has enough space for 7 persons and few luggage. These automatic vehicles with their impressive cutting edge technology engine are ideal for both long and short distances throughout Athens Region and Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '7', airBag: 'Yes', luggage: '446L or 1100L', fuel: null, doors: '5', cdPlayer: 'No', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-f1-manual',
    name: 'Category F1 - 9 Seats Manual',
    type: 'Manual',
    carId: 24,
    example: 'Nissan Primastar, VW Transporter 9 Seats or similar',
    description: "At first, you'll wonder if the Vehicles of Category F1 (Nissan Primastar, VW Transporter - 9 Seats or similar) are cars or minivans. In reality, they are a combination of the best features of both of them. They offer safe driving, allowing you to make the most of your travels in Greece with enough space for 9 persons and a fair amount of luggage.",
    priceNote: PRICE_NOTE,
    specs: { seats: '9', airBag: 'Yes', luggage: '700L', fuel: 'Turbo Diesel Euro-6', doors: '4', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-f4-automatic',
    name: 'Category F4 - 8 Seats Automatic',
    type: 'Automatic',
    carId: 21,
    example: 'Nissan Primastar 8 Seats Auto or similar',
    description: 'Category F4 Vehicles (Nissan Primastar 8 Seats Auto or similar) has enough space for 8 persons and few luggage. These automatic vehicles with their impressive cutting edge technology engine are ideal for both long and short distances throughout Athens Region and Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '8', airBag: 'Yes', luggage: '700L', fuel: null, doors: '5', cdPlayer: 'No', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-f5-automatic',
    name: 'Category F5 - 9 Seats Automatic',
    type: 'Automatic',
    carId: null,
    example: 'Hyundai Staria 9 Seats or similar',
    description: 'Category F5 Vehicles (Hyundai Staria 9 Seats or similar) has enough space for 9 persons and few luggage. These automatic vehicles with their impressive cutting edge technology engine are ideal for both long and short distances throughout Athens Region and Greece.',
    priceNote: PRICE_NOTE,
    specs: { seats: '9', airBag: 'Yes', luggage: '700L', fuel: null, doors: '4', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-l1-luxury-automatic',
    name: 'Category L1 Luxury Automatic',
    type: 'Luxury',
    carId: 35,
    example: 'BMW X1 or similar',
    description: "Vehicles under the L1 category (BMW X1 or similar) have been the pinnacle of comfort and prestige for many years. These cars strive for luxury, refinement and overall perfection. The materials and the engines provided are crafted and tuned to provide you maximum comfort, safety and a pleasant driving experience while cruising around Greece's mainland or the islands! If comfort, a prestigious image, top of the line technology that will make driving safer and hassle free, is what you are looking for, you will not be disappointed.",
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '450L', fuel: 'Unleaded or Diesel', doors: '5', cdPlayer: 'No', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-l2-luxury-automatic',
    name: 'Category L2 Luxury Automatic',
    type: 'Luxury',
    carId: 36,
    example: 'Mercedes GLB 200 or similar',
    description: "Vehicles under the L2 category (Mercedes GLB 200 or Similar) are widely considered as the most complete and luxurious SUVs you can get from the automotive industry. These cars strive for luxury, refinement and overall perfection. The materials and the engines provided are crafted and tuned to provide you maximum comfort, safety and a pleasant driving experience while cruising around Greece's mainland or the islands! If comfort, a prestigious image, top of the line technology that will make driving safer and hassle free, is what you are looking for, you will not be disappointed.",
    priceNote: PRICE_NOTE,
    specs: { seats: '5', airBag: 'Yes', luggage: '575 or 650L', fuel: 'Unleaded or Diesel', doors: '5', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
  {
    slug: 'category-v-manual-small-van',
    name: 'Category V Manual - Small Van',
    type: 'Van',
    carId: 39,
    example: 'Renault Trafic L1H1 or similar, small cargo van',
    description: 'Category V Vehicles (Renault Trafic L1H1 or similar – Small Cargo Van) offer a practical and reliable solution for transporting goods and equipment. Featuring a spacious cargo area of 5.8 m³, a payload capacity of up to 1,100 kg, and a fuel-efficient diesel engine, they are ideal for business needs, deliveries, and transportation throughout Athens and Greece.',
    specs: { seats: '3', airBag: 'Yes', luggage: '5.8 m³ - Up to 1,100 kg', luggageLabel: 'Cargo capacity', fuel: 'Diesel', doors: '4', cdPlayer: 'No', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-v1-manual-large-van',
    name: 'Category V1 Manual - Large Van',
    type: 'Van',
    carId: 40,
    example: 'Renault Trafic L2H1 or similar, large cargo van',
    description: 'Category V1 Vehicles (Renault Trafic L2H1 or similar – Large Cargo Van) provide increased cargo space and flexibility for larger transportation needs. With a generous cargo volume of 7.7 m³, a payload capacity of up to 1,100 kg, and a fuel-efficient diesel engine, they are an excellent choice for transporting bulky goods, professional equipment, and commercial loads throughout Athens and Greece.',
    specs: { seats: '3', airBag: 'Yes', luggage: '7.7 m³ - Up to 1,100 kg', luggageLabel: 'Cargo capacity', fuel: 'Diesel', doors: '4', cdPlayer: 'No', abs: 'Yes', ac: 'Yes', gear: 'Manual' },
  },
  {
    slug: 'category-diesel-l5-automatic',
    name: 'Category Diesel L5 - 9 Seats Auto',
    type: 'Automatic',
    carId: null,
    example: 'Mercedes Vito 9 Seats Auto, Ford Grand Tourneo Custom 9 Seats Auto',
    description: 'Category L5 Vehicles (Mercedes Vito 9 Seats Auto, Ford Grand Tourneo Custom 9 Seats Auto) has enough space for 9 persons and a fair amount of luggage. These automatic vehicles with their impressive cutting edge technology engine offer fuel economy and are ideal for both long and short distances throughout Athens Region and Greece.',
    note: 'Please note that diesel is available at all Gas stations around Greece as it is commonly used by Taxis, Buses etc.',
    priceNote: PRICE_NOTE,
    specs: { seats: '9', airBag: 'Yes', luggage: '1000L', fuel: 'Turbo Diesel Euro-6', doors: '4', cdPlayer: 'Yes', abs: 'Yes', ac: 'Yes', gear: 'Automatic' },
  },
]

const categoryImages = {
  'category-b-manual': ['/images/CategoryBManual.png'],
  'category-c-manual': ['/images/CategoryCManual.png'],
  'category-d-manual': ['/images/CategoryDMAnual.png'],
  'category-d1-manual': ['/images/CategoryD1Manual.png'],
  'category-e-automatic': ['/images/categoryEautomatic.png'],
  'category-e1-automatic': ['/images/categoryE1automatic.png'],
  'category-e2-automatic': ['/images/categoryE2automatic.png'],
  'category-e3-automatic': ['/images/categoryE3automatic.png'],
  'category-d3-manual': ['/images/categoryD3Manual.png'],
  'category-g-automatic': ['/images/CategoryGAutomatic.png'],
  'category-g1-automatic': ['/images/categoryG1Automatic.png', '/images/G1Automatic.PNG'],
  'category-g2-automatic': ['/images/categoryG2Automatic.png'],
  'category-f-manual': ['/images/CategoryF.png'],
  'category-f2-automatic': ['/images/CategoryF2.png'],
  'category-f3-automatic': ['/images/CategoryF3.png'],
  'category-f1-manual': ['/images/categoryf1.png'],
  'category-f4-automatic': ['/images/categoryF4.png'],
  'category-f5-automatic': ['/images/categoryf5.png'],
  'category-l1-luxury-automatic': ['/images/categoryl1.png'],
  'category-l2-luxury-automatic': ['/images/categoryl2.png'],
  'category-v-manual-small-van': ['/images/categoryv.jpg'],
  'category-v1-manual-large-van': ['/images/categoryv1.jpg'],
  'category-diesel-l5-automatic': ['/images/categorydiesel.png'],
}

export const categories = categoryData.map((category) => {
  const images = categoryImages[category.slug] ?? []
  return {
    ...category,
    image: images[0] ?? null,
    images,
    ratesInclude: RATES_INCLUDE,
    filters: Object.entries(categoryFilterSlugs)
      .filter(([, slugs]) => slugs.includes(category.slug))
      .map(([filter]) => filter),
  }
})

if (import.meta.env?.DEV) {
  const seenSlugs = new Set()
  const seenImages = new Set()

  for (const category of categories) {
    if (seenSlugs.has(category.slug)) {
      console.warn(`Duplicate vehicle category slug: ${category.slug}`)
    }
    seenSlugs.add(category.slug)

    for (const image of category.images) {
      if (seenImages.has(image)) {
        console.warn(`Duplicate vehicle category image path: ${image}`)
      }
      seenImages.add(image)

      fetch(image, { method: 'HEAD' }).then((response) => {
        if (!response.ok) {
          console.warn(`Vehicle category image file does not exist: ${image}`)
        }
      }).catch((error) => {
        console.warn(`Unable to verify vehicle category image "${image}":`, error)
      })
    }
  }
}

export const categoryFilters = [
  { id: 'all', label: 'All' },
  { id: 'standard', label: 'Standard' },
  { id: 'automatic', label: 'Automatic Cars' },
  { id: 'minivans', label: 'Mini Vans' },
  { id: 'minivanAutomatic', label: 'Mini Van Automatic' },
  { id: 'suv', label: "SUV's" },
  { id: 'luxury', label: 'Luxury Cars' },
]
