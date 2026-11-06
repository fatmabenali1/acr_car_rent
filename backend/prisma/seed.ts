import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, FuelType, Transmission, VehicleGroup } from "@prisma/client";

const prisma = new PrismaClient();
const bilingual = (en: string, el: string) => ({ en, el });
const internationalPermitExemptCountries = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO", "CH", "GB", "AD", "SM", "MC", "BA", "RS", "ME", "MK",
  "AL", "AM", "AZ", "BY", "GE", "KZ", "KG", "MD", "RU", "TJ", "TM", "UA", "UZ",
  "DZ", "AO", "BJ", "BW", "BF", "CV", "CF", "TD", "KM", "CG", "CI", "CD", "EG",
  "ET", "GQ", "GA", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML",
  "MA", "MZ", "NA", "NE", "NG", "RW", "SN", "SC", "SL", "ZA", "SZ", "TG", "TN",
  "UG", "ZM", "ZW", "BD", "BN", "KH", "CN", "IN", "ID", "IR", "IL", "JP", "JO",
  "LA", "LB", "MY", "MN", "MM", "NP", "PK", "PH", "KR", "LK", "SY", "TH", "TR",
  "AE", "VN", "AR", "BS", "BR", "CL", "CU", "EC", "GY", "HT", "PE", "TT", "UY",
  "US", "CA", "AU",
];
const rentalPolicy = {
  currency: "EUR",
  vatPercent: 24,
  minimumDriverAge: 23,
  standardMinimumDriverAge: 23,
  otherMinimumDriverAge: 25,
  maximumDriverAge: 75,
  minimumLicenceYears: 1,
  internationalPermitExemptCountries,
  freeKilometresFromDays: 3,
  dailyKilometreLimitForShortRentals: 200,
  extraDayGraceHours: 3,
  minDepositEur: 50,
  depositSharePercent: { min: 10, max: 15 },
  airportNightWindow: { from: "23:00", until: "07:00" },
  otherLocationsWindow: { from: "07:00", until: "21:00" },
  availabilityCountDepositPending: false,
  availabilityStockVisibility: "LEVEL",
  availabilityLowStockThreshold: 2,
  prices: "TODO: Configure seasonal and duration price plans; do not enter invented prices.",
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const vehicles = [
  { code: "B", slug: "standard-b", group: VehicleGroup.STANDARD, transmission: Transmission.MANUAL, name: bilingual("Category B", "Κατηγορία B"), exampleModels: ["Fiat Panda"], seats: 4, doors: 5, luggageMinLitres: 220, luggageMaxLitres: 250, fuel: FuelType.PETROL },
  { code: "C", slug: "standard-c", group: VehicleGroup.STANDARD, transmission: Transmission.MANUAL, name: bilingual("Category C", "Κατηγορία C"), exampleModels: ["Dacia Sandero", "Suzuki Swift"], seats: 5, doors: 5, luggageMinLitres: 270, luggageMaxLitres: 330, fuel: FuelType.PETROL_OR_DIESEL },
  { code: "D", slug: "standard-d", group: VehicleGroup.STANDARD, transmission: Transmission.MANUAL, name: bilingual("Category D", "Κατηγορία D"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "D1", slug: "standard-d1", group: VehicleGroup.STANDARD, transmission: Transmission.MANUAL, name: bilingual("Category D1", "Κατηγορία D1"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "E", slug: "automatic-e", group: VehicleGroup.AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category E", "Κατηγορία E"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "E1", slug: "automatic-e1", group: VehicleGroup.AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category E1", "Κατηγορία E1"), exampleModels: ["Seat Arona", "Kia Stonic"], seats: 5, doors: 5, luggageMinLitres: 370, luggageMaxLitres: 400, fuel: FuelType.PETROL },
  { code: "E2", slug: "automatic-e2", group: VehicleGroup.AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category E2", "Κατηγορία E2"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "E3", slug: "automatic-e3", group: VehicleGroup.AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category E3", "Κατηγορία E3"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "D3", slug: "suv-d3", group: VehicleGroup.SUV, transmission: Transmission.MANUAL, name: bilingual("Category D3", "Κατηγορία D3"), exampleModels: ["Skoda Kamiq", "Suzuki Vitara"], seats: null, doors: null, luggageMinLitres: 400, luggageMaxLitres: 420, fuel: null },
  { code: "G", slug: "suv-g", group: VehicleGroup.SUV, transmission: Transmission.AUTOMATIC, name: bilingual("Category G", "Κατηγορία G"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "G1", slug: "suv-g1", group: VehicleGroup.SUV, transmission: Transmission.AUTOMATIC, name: bilingual("Category G1", "Κατηγορία G1"), exampleModels: ["Nissan Qashqai", "Dacia Duster", "Leapmotor C10"], seats: null, doors: null, luggageMinLitres: 500, luggageMaxLitres: 550, fuel: null },
  { code: "G2", slug: "suv-g2", group: VehicleGroup.SUV, transmission: Transmission.AUTOMATIC, name: bilingual("Category G2", "Κατηγορία G2"), exampleModels: [], seats: 7, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "F", slug: "mini-van-f", group: VehicleGroup.MINI_VANS, transmission: Transmission.MANUAL, name: bilingual("Category F", "Κατηγορία F"), exampleModels: [], seats: 7, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "F1", slug: "mini-van-f1", group: VehicleGroup.MINI_VANS, transmission: Transmission.MANUAL, name: bilingual("Category F1", "Κατηγορία F1"), exampleModels: [], seats: 9, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "F2", slug: "mini-van-automatic-f2", group: VehicleGroup.MINI_VAN_AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category F2", "Κατηγορία F2"), exampleModels: [], seats: 7, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "F3", slug: "mini-van-automatic-f3", group: VehicleGroup.MINI_VAN_AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category F3", "Κατηγορία F3"), exampleModels: [], seats: 7, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "F4", slug: "mini-van-automatic-f4", group: VehicleGroup.MINI_VAN_AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category F4", "Κατηγορία F4"), exampleModels: [], seats: 8, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "F5", slug: "mini-van-automatic-f5", group: VehicleGroup.MINI_VAN_AUTOMATIC, transmission: Transmission.AUTOMATIC, name: bilingual("Category F5", "Κατηγορία F5"), exampleModels: [], seats: 9, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "L1", slug: "luxury-l1", group: VehicleGroup.LUXURY, transmission: null, name: bilingual("Category L1", "Κατηγορία L1"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "L2", slug: "luxury-l2", group: VehicleGroup.LUXURY, transmission: null, name: bilingual("Category L2", "Κατηγορία L2"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "L3", slug: "luxury-l3", group: VehicleGroup.LUXURY, transmission: null, name: bilingual("Category L3 saloon", "Κατηγορία L3 σεντάν"), exampleModels: [], seats: null, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: null },
  { code: "L4", slug: "luxury-l4", group: VehicleGroup.LUXURY, transmission: Transmission.AUTOMATIC, name: bilingual("Category L4", "Κατηγορία L4"), exampleModels: [], seats: 8, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: FuelType.DIESEL },
  { code: "L5", slug: "luxury-l5", group: VehicleGroup.LUXURY, transmission: Transmission.AUTOMATIC, name: bilingual("Category L5 VIP van", "Κατηγορία L5 VIP βαν"), exampleModels: [], seats: 9, doors: null, luggageMinLitres: null, luggageMaxLitres: null, fuel: FuelType.DIESEL },
].map((vehicle, index) => ({
  ...vehicle,
  airbag: null,
  abs: null,
  airConditioning: null,
  cdPlayer: null,
  imageUrl: null,
  cdwExcessEur: null,
  minimumDriverAge: ["B", "C", "D", "D1", "E", "E1", "E2"].includes(vehicle.code) ? 23 : 25,
  displayOrder: index + 1,
}));

const locations = [
  { slug: "athens-international-airport", name: bilingual("Athens International Airport", "Διεθνής Αερολιμένας Αθηνών"), isAirport: true, isFree: true },
  { slug: "athens-city-center", name: bilingual("Athens City Center", "Κέντρο Αθήνας") },
  { slug: "koropi-metro-station", name: bilingual("Koropi Metro Station", "Σταθμός Μετρό Κορωπίου"), isFree: true },
  { slug: "piraeus-port", name: bilingual("Piraeus Port", "Λιμάνι Πειραιά") },
  { slug: "glyfada", name: bilingual("Glyfada", "Γλυφάδα") },
  { slug: "marousi", name: bilingual("Marousi", "Μαρούσι") },
  { slug: "other-location", name: bilingual("Other Location", "Άλλη τοποθεσία") },
];

const pageSlugs = [
  "about-us", "customer-reviews", "winners-of-the-tripadvisor-travelers-choice-award",
  "acr-cargo-vans", "car-rentals-travel-guide", "athens-rentacar-routes-attica",
  "athens-rentacar-routes-peloponnese", "athens-rentacar-routes-central-greece",
  "top-vehicles-categories", "athens-airport-rent-a-car", "athens-travel-resources",
  "athens-information", "privacy-policy", "cookiesprivacy-policy", "luxury-cars",
  "mini-vans", "4x4-suv", "standard-cars", "automatic-cars", "automatic-mini-van",
];

const faqQuestions = [
  ["driving-licence", "What driving licence do I need?", "Τι άδεια οδήγησης χρειάζομαι;"],
  ["driver-age", "What is the minimum and maximum driver age?", "Ποια είναι η ελάχιστη και η μέγιστη ηλικία οδηγού;"],
  ["included", "What is included in the rental price?", "Τι περιλαμβάνεται στην τιμή ενοικίασης;"],
  ["cdw", "What does CDW insurance cover?", "Τι καλύπτει η ασφάλεια CDW;"],
  ["fdw", "Can I reduce the excess to zero with FDW?", "Μπορώ να μηδενίσω την απαλλαγή με FDW;"],
  ["theft", "Is theft and fire insurance included?", "Περιλαμβάνεται ασφάλεια κλοπής και πυρκαγιάς;"],
  ["fuel", "What is the fuel policy?", "Ποια είναι η πολιτική καυσίμων;"],
  ["islands", "Can I take the car to the Greek islands?", "Μπορώ να πάρω το αυτοκίνητο στα ελληνικά νησιά;"],
  ["borders", "Can I drive the car outside Greece?", "Μπορώ να οδηγήσω το αυτοκίνητο εκτός Ελλάδας;"],
  ["additional-drivers", "Are additional drivers allowed?", "Επιτρέπονται επιπλέον οδηγοί;"],
  ["extras", "Which optional extras can I request?", "Ποια προαιρετικά πρόσθετα μπορώ να ζητήσω;"],
  ["delivery", "Where can the car be delivered or collected?", "Πού μπορεί να παραδοθεί ή να επιστραφεί το αυτοκίνητο;"],
  ["hours", "What are the pickup and return hours?", "Ποιο είναι το ωράριο παραλαβής και επιστροφής;"],
  ["extra-day", "When is an extra rental day charged?", "Πότε χρεώνεται επιπλέον ημέρα ενοικίασης;"],
  ["vehicle-model", "Is the exact vehicle model guaranteed?", "Είναι εγγυημένο το ακριβές μοντέλο αυτοκινήτου;"],
  ["fleet-age", "How old are the vehicles in the fleet?", "Πόσο παλιά είναι τα οχήματα του στόλου;"],
  ["deposit", "How much deposit is required?", "Πόση προκαταβολή απαιτείται;"],
  ["cancellation", "What is the cancellation policy?", "Ποια είναι η πολιτική ακύρωσης;"],
  ["modification", "Can I modify my rental request?", "Μπορώ να τροποποιήσω το αίτημα ενοικίασης;"],
  ["card-payment", "Can I pay by card without a surcharge?", "Μπορώ να πληρώσω με κάρτα χωρίς επιβάρυνση;"],
  ["preauthorisation", "Is a card pre-authorisation required?", "Απαιτείται προέγκριση κάρτας;"],
  ["pickup", "Where do I collect the car at the airport?", "Από πού παραλαμβάνω το αυτοκίνητο στο αεροδρόμιο;"],
  ["off-road", "Can I drive the car off-road?", "Μπορώ να οδηγήσω εκτός δρόμου;"],
  ["accident", "What should I do in case of an accident or breakdown?", "Τι πρέπει να κάνω σε περίπτωση ατυχήματος ή βλάβης;"],
  ["return", "What should I do when returning the car?", "Τι πρέπει να κάνω κατά την επιστροφή του αυτοκινήτου;"],
  ["washing", "Do I need to wash the car before returning it?", "Πρέπει να πλύνω το αυτοκίνητο πριν το επιστρέψω;"],
  ["police-plates", "What happens if the police remove the vehicle plates?", "Τι συμβαίνει αν η αστυνομία αφαιρέσει τις πινακίδες του οχήματος;"],
];

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error("Configure both ADMIN_EMAIL and ADMIN_PASSWORD to seed the first administrator");
  }
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
    }
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: "ADMIN", isActive: true },
      create: { email: adminEmail, passwordHash, role: "ADMIN" },
    });
  }

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { code: vehicle.code },
      update: vehicle,
      create: vehicle,
    });
  }

  for (const [index, location] of locations.entries()) {
    await prisma.location.upsert({
      where: { slug: location.slug },
      update: { ...location, phone: "+30 210 6624887", displayOrder: index + 1 },
      create: { ...location, phone: "+30 210 6624887", displayOrder: index + 1 },
    });
  }

  const extras = [
    { code: "GPS", slug: "gps", name: bilingual("GPS", "GPS"), requiresChildAge: false, requiresChildWeight: false },
    { code: "BABY_SEAT", slug: "baby-seat", name: bilingual("Baby seat", "Παιδικό κάθισμα"), requiresChildAge: true, requiresChildWeight: true },
    { code: "BOOSTER", slug: "booster-seat", name: bilingual("Booster seat", "Παιδικό κάθισμα ανύψωσης"), requiresChildAge: true, requiresChildWeight: true },
    { code: "WIFI", slug: "wifi-hotspot", name: bilingual("Wi-Fi hotspot", "Wi-Fi hotspot"), requiresChildAge: false, requiresChildWeight: false },
  ];
  for (const extra of extras) {
    await prisma.extra.upsert({ where: { code: extra.code }, update: extra, create: extra });
  }

  for (const [index, question] of faqQuestions.entries()) {
    const [key, en, el] = question;
    await prisma.faq.upsert({
      where: { key },
      update: { question: bilingual(en, el), answer: bilingual("TODO: Add approved answer.", "TODO: Προσθέστε εγκεκριμένη απάντηση."), displayOrder: index + 1 },
      create: { key, question: bilingual(en, el), answer: bilingual("TODO: Add approved answer.", "TODO: Προσθέστε εγκεκριμένη απάντηση."), displayOrder: index + 1 },
    });
  }

  for (const slug of pageSlugs) {
    await prisma.contentPage.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: bilingual(slug, slug),
        body: bilingual("TODO: Add approved English page content.", "TODO: Προσθέστε εγκεκριμένο ελληνικό περιεχόμενο."),
      },
    });
  }

  for (let index = 1; index <= 10; index += 1) {
    const key = `home-slide-${index}`;
    await prisma.homeSlide.upsert({
      where: { key },
      update: {},
      create: { key, title: bilingual("TODO: Home slide", "TODO: Διαφάνεια αρχικής"), displayOrder: index, isActive: false },
    });
  }
  for (let index = 1; index <= 7; index += 1) {
    const key = `home-banner-${index}`;
    await prisma.homeBanner.upsert({
      where: { key },
      update: {},
      create: { key, title: bilingual("TODO: Home banner", "TODO: Banner αρχικής"), displayOrder: index, isActive: false },
    });
  }

  await prisma.setting.upsert({
    where: { key: "home-arguments" },
    update: {
      value: [
        bilingual("0% card payment fees", "0% προμήθεια για πληρωμή με κάρτα"),
        bilingual("Free, pre-authorised ferry travel to all Greek islands", "Δωρεάν, προεγκεκριμένη μεταφορά με πλοίο σε όλα τα ελληνικά νησιά"),
        bilingual("24/7 express airport delivery by appointment", "Άμεση παράδοση στο αεροδρόμιο όλο το 24ωρο κατόπιν ραντεβού"),
        bilingual("Fleet averaging 18 months old; maximum vehicle age 5 years", "Στόλος με μέση ηλικία 18 μηνών και μέγιστη ηλικία οχημάτων 5 ετών"),
        bilingual("ABS and airbags in every vehicle", "ABS και αερόσακοι σε όλα τα οχήματα"),
        bilingual("Final prices with no hidden charges", "Τελικές τιμές χωρίς κρυφές χρεώσεις"),
        bilingual("Discounts for long-term rentals", "Εκπτώσεις για μακροχρόνιες ενοικιάσεις"),
        bilingual("TripAdvisor Travelers' Choice award winner", "Βραβευμένη με το TripAdvisor Travelers' Choice"),
        bilingual("Passenger cars and cargo vans", "Επιβατικά αυτοκίνητα και van μεταφοράς φορτίου"),
      ],
    },
    create: {
      key: "home-arguments",
      value: [
        bilingual("0% card payment fees", "0% προμήθεια για πληρωμή με κάρτα"),
        bilingual("Free, pre-authorised ferry travel to all Greek islands", "Δωρεάν, προεγκεκριμένη μεταφορά με πλοίο σε όλα τα ελληνικά νησιά"),
        bilingual("24/7 express airport delivery by appointment", "Άμεση παράδοση στο αεροδρόμιο όλο το 24ωρο κατόπιν ραντεβού"),
        bilingual("Fleet averaging 18 months old; maximum vehicle age 5 years", "Στόλος με μέση ηλικία 18 μηνών και μέγιστη ηλικία οχημάτων 5 ετών"),
        bilingual("ABS and airbags in every vehicle", "ABS και αερόσακοι σε όλα τα οχήματα"),
        bilingual("Final prices with no hidden charges", "Τελικές τιμές χωρίς κρυφές χρεώσεις"),
        bilingual("Discounts for long-term rentals", "Εκπτώσεις για μακροχρόνιες ενοικιάσεις"),
        bilingual("TripAdvisor Travelers' Choice award winner", "Βραβευμένη με το TripAdvisor Travelers' Choice"),
        bilingual("Passenger cars and cargo vans", "Επιβατικά αυτοκίνητα και van μεταφοράς φορτίου"),
      ],
    },
  });

  await prisma.setting.upsert({
    where: { key: "company-info" },
    update: {},
    create: {
      key: "company-info",
      value: {
        name: "Athens Car Rental (ACR)",
        founded: 2005,
        address: bilingual("3rd km Markopoulou–Paiania Avenue, Koropi", "3ο χλμ. Λεωφόρου Μαρκοπούλου–Παιανίας, Κορωπί"),
        postalCode: "19441",
        map: { latitude: 37.9019, longitude: 23.8955 },
        airportPickup: bilingual(
          "The ACR office is 5 minutes from the airport. Free shuttle pickup is at door 3 of the arrivals hall.",
          "Το γραφείο ACR απέχει 5 λεπτά από το αεροδρόμιο. Η δωρεάν μεταφορά αναχωρεί από την πόρτα 3 της αίθουσας αφίξεων.",
        ),
        social: [
          { network: "Facebook", url: null },
          { network: "Instagram", url: null },
        ],
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: "rental-info" },
    update: {},
    create: {
      key: "rental-info",
      value: {
        currency: "EUR",
        vatPercent: 24,
        included: [
          bilingual("Third-party liability insurance", "Ασφάλιση αστικής ευθύνης προς τρίτους"),
          bilingual("CDW cover with an excess", "Κάλυψη CDW με απαλλαγή"),
          bilingual("Theft and fire protection", "Κάλυψη κλοπής και πυρκαγιάς"),
          bilingual("Ferry insurance", "Ασφάλιση για μεταφορά με πλοίο"),
          bilingual("Free additional drivers", "Δωρεάν επιπλέον οδηγοί"),
          bilingual("24/7 roadside assistance in Greece", "Οδική βοήθεια 24/7 στην Ελλάδα"),
          bilingual("Registration fees and 24% VAT", "Τέλη κυκλοφορίας και ΦΠΑ 24%"),
          bilingual("Airport delivery and return", "Παράδοση και επιστροφή στο αεροδρόμιο"),
        ],
        driver: {
          minimumAgeSmallAndMedium: 23,
          minimumAgeOtherCategories: 25,
          maximumAge: 75,
          minimumLicenceYears: 1,
          internationalPermitExemptCountries,
          internationalPermitRequiredOutside: ["EU", "USA", "Australia", "Canada", "Vienna Convention countries"],
          additionalDriversSameRules: true,
        },
        insurance: {
          cdwExcessSmallAndMediumEur: 800,
          cdwExcessSuvMinivansLuxuryEur: 2000,
          theftAndFireExcessSameAsCdw: true,
          fdwExcessEur: 0,
          fdwMinimumRentalDaysExclusive: 5,
          fdwHasAdditionalCharge: true,
          fdwExcludes: bilingual("Tyres and underbody", "Ελαστικά και κάτω μέρος του οχήματος"),
          excessCardPreauthorisationAtPickup: true,
          exclusions: [
            "Antenna", "Keys", "Locks", "Windscreen wipers", "Interior", "Wheel covers",
            "Lights", "Fuel cap", "Roof and roof rack", "Child seats", "Battery", "Documents",
            "Number plates", "Punctured tyres", "Towing", "Driving under alcohol or drugs",
          ],
        },
        mileage: {
          unlimitedFromRentalDays: 3,
          dailyLimitForOneOrTwoDays: 200,
        },
        delivery: {
          freeLocations: ["Athens International Airport", "Koropi Metro Station"],
          otherAthensLocationsStartingFeeEur: 30,
          shortRentalDaysThreshold: 5,
          shortRentalLocations: ["Athens International Airport", "Koropi Metro Station"],
          airportByAppointment24Hours: true,
          airportNightFeeWindow: { from: "23:00", until: "07:00" },
          otherLocationsWindow: { from: "07:00", until: "21:00" },
        },
        fuel: {
          policy: bilingual("Return the vehicle with the same fuel level; refuelling is charged if lower.", "Επιστρέψτε το όχημα με την ίδια στάθμη καυσίμου· η αναπλήρωση χρεώνεται αν είναι χαμηλότερη."),
          minimumRefuellingChargeEur: 20,
        },
        return: {
          extraDayAfterHours: 3,
          washingRequiredOnlyForExtremeDirt: true,
          extraDaysIfPoliceRemovePlates: true,
        },
        deposit: {
          minimumEur: 50,
          usualSharePercent: { min: 10, max: 15 },
          amountSetInQuote: true,
        },
        cancellation: {
          smallAndMediumNoticeDays: 7,
          suvAndMinivanNoticeDays: 15,
          refundDepositWhenNoticeRequirementMet: true,
          configurableByCategory: true,
        },
        restrictions: [
          bilingual("Driving outside Greece is not permitted.", "Η οδήγηση εκτός Ελλάδας δεν επιτρέπεται."),
          bilingual("Off-road driving is not permitted.", "Η οδήγηση εκτός δρόμου δεν επιτρέπεται."),
          bilingual("The exact vehicle model is not guaranteed; category, size and transmission are guaranteed.", "Το ακριβές μοντέλο δεν είναι εγγυημένο· εγγυώνται η κατηγορία, το μέγεθος και το κιβώτιο."),
          bilingual("The vehicle may be taken to Greek islands by ferry with prior authorisation.", "Το όχημα μπορεί να μεταφερθεί στα ελληνικά νησιά με πλοίο κατόπιν προηγούμενης έγκρισης."),
        ],
        extras: {
          priceRangeEurPerUnit: { min: 20, max: 30 },
          childAgeAndWeightRequiredForChildSeats: true,
          items: ["GPS", "Baby seats", "Booster seats", "Wi-Fi hotspot"],
        },
        pricing: "TODO: Configure approved seasonal and duration price plans. No public prices are available.",
      },
    },
  });

  const existingRentalPolicy = await prisma.setting.findUnique({ where: { key: "rental-policy" } });
  const existingRentalPolicyValue = isPlainRecord(existingRentalPolicy?.value)
    ? existingRentalPolicy.value
    : {};
  const existingExemptCountries = Array.isArray(existingRentalPolicyValue.internationalPermitExemptCountries)
    ? existingRentalPolicyValue.internationalPermitExemptCountries.filter((country): country is string => typeof country === "string")
    : [];
  const existingCancellationDays = isPlainRecord(existingRentalPolicyValue.cancellationNoticeDaysByVehicleCode)
    ? existingRentalPolicyValue.cancellationNoticeDaysByVehicleCode
    : {};
  const cancellationNoticeDaysByVehicleCode = Object.fromEntries(
    vehicles.flatMap((vehicle) => {
      if (vehicle.group === VehicleGroup.STANDARD || vehicle.group === VehicleGroup.AUTOMATIC) {
        return [[vehicle.code, 7]];
      }
      if (
        vehicle.group === VehicleGroup.SUV ||
        vehicle.group === VehicleGroup.MINI_VANS ||
        vehicle.group === VehicleGroup.MINI_VAN_AUTOMATIC
      ) {
        return [[vehicle.code, 15]];
      }
      return [];
    }),
  );
  const mergedRentalPolicy = {
    ...rentalPolicy,
    ...existingRentalPolicyValue,
    cancellationNoticeDaysByVehicleCode: {
      ...cancellationNoticeDaysByVehicleCode,
      ...existingCancellationDays,
    },
    internationalPermitExemptCountries: [
      ...new Set([...internationalPermitExemptCountries, ...existingExemptCountries]),
    ],
  } as Prisma.InputJsonValue;

  await prisma.setting.upsert({
    where: { key: "rental-policy" },
    update: { value: mergedRentalPolicy },
    create: {
      key: "rental-policy",
      value: mergedRentalPolicy,
    },
  });

  console.info(`Seeded ${vehicles.length} vehicle categories, ${locations.length} locations and ${faqQuestions.length} FAQ entries.`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
