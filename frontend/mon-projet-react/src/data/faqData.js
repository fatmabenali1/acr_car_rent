const faqData = [
  {
    id: 1,
    category: 'Drivers & Documents',
    question: 'Do I need an International Driving License?',
    answer: `Accepted driving licenses (which must have been in the customer's possession for at least 1 year) under current Greek law:
• European (from E.U. countries), USA, Australia and Canada
• Issued by any country that is a party to the Vienna Convention on Road Traffic

If the driver's national license (held for at least 1 year) does not meet any of the above requirements, a valid International Driving License is required. It can even be just one day old.`,
  },
  {
    id: 2,
    category: 'Drivers & Documents',
    question: 'What is the driver age policy?',
    answer: 'The lessee, for themselves and for every additional driver, solemnly and unconditionally declares, knowing the consequences of the law, that they have reached the minimum age of 23 years in order to use Category B, C, D, D1, E, E1, E2 cars. For the other categories, the minimum age of the lessee-driver and any additional driver is set at 25. The maximum age is 75 years. Anyone above this age must contact us directly by email before proceeding with a booking.',
  },
  {
    id: 3,
    category: 'Insurance & Deposit',
    question: 'What is included in your offer?',
    answer: `Our rates include:
• Civil liability and third party liability insurance
• C.D.W. insurance (800.00 to 2000.00 Euros deductible)
• Theft and fire insurance
• Ferry insurance (the vehicle is insured even while boarded on a ferry)
• Unlimited mileage for rentals exceeding 3 days
• Additional drivers
• 24-hour road assistance
• Delivery & collection at Athens International Airport and 24% VAT`,
  },
  {
    id: 4,
    category: 'Insurance & Deposit',
    question: 'What is C.D.W. Insurance and how does it work?',
    answer: `C.D.W. (Collision Damage Waiver) is full insurance that covers the rented car in all kinds of accidents caused by the renter, with a maximum deductible per incident as agreed. The deductible is usually 800.00 Euros per accident for small and mid-sized cars and can reach 2000.00 Euros for luxury cars, minivans and SUVs. This means that if the customer is involved in an accident for which they are liable, the maximum amount they will have to pay for that accident is the deductible.

Examples for a car with an 800.00 Euros deductible:
Repair cost of 100.00 Euros: the customer is charged 100.00 Euros.
Repair cost of 2000.00 Euros: the customer is charged 800.00 Euros.

Exceptions in CDW & FDW: the following damages are charged directly to the client:
• antenna
• trays
• damage to car lock
• loss or damage to the keys
• windshield wipers
• interior of the car
• spare key and car jack
• hubcap
• lights
• gas cap
• damage to upholstery
• damage to the roof
• damage caused by a roof rack and any luggage on it
• extremely messy and/or filthy car
• personal belongings in a rented car
• damage due to negligence
• fuel errors
• damage to child seats and baby seats
• lack of battery power because of forgotten electrical devices left on
• loss of car documents
• loss of registration plate

Also:
• ACR is in no case obliged to replace a flat tire or to cover damage to media devices (radio, CD/MP3 player, etc.).
• Towing costs are not covered by any insurance.
• Athens Car Rental does not refund any telephone, taxi or hotel costs.
• Athens Car Rental and the insurance company are not responsible for anyone driving under the influence of alcohol or drugs, causing willful damage, driving off-road, driving without care and attention, or for damage caused by negligence and traffic violations, nor for compensation due to loss of the vehicle. The client accepts direct responsibility for such claims.
• Any unnoticed accident or damage to the vehicle may be interpreted as negligence (for example, refueling with the wrong type of fuel). This may result in additional charges to the client.`,
  },
  {
    id: 5,
    category: 'Insurance & Deposit',
    question: 'Is there an option to reduce or eliminate the C.D.W. to zero? (Full Damage Waiver, no excess)',
    answer: 'For rentals shorter than 5 days, we cannot provide F.D.W. (0.00 Euros deductible). For rentals longer than 5 days, F.D.W. can be provided for an additional fee, depending on the category and the number of rental days. Even with this option, tires and the underneath parts of the vehicle are not covered. Even with F.D.W., the procedure of freezing the deductible amount on your card remains the same.',
  },
  {
    id: 6,
    category: 'Insurance & Deposit',
    question: 'What is Theft & Fire insurance?',
    answer: "Theft & fire insurance reduces the driver's liability in case of total theft of the vehicle or fire (800.00 to 2,000.00 Euros depending on the vehicle category). In case of total theft or fire, you must contact our office and the police immediately to report the incident, and submit at our office a copy of the police report, the rental agreement and the vehicle's key. Theft protection does not apply beyond the agreed rental date.",
  },
  {
    id: 7,
    category: 'Rental Conditions',
    question: "What is ACR's fuel policy?",
    answer: 'Our policy is to return the vehicle with the same fuel level as at delivery (same-to-same). At delivery you can check the fuel indicator with our representative; the level is noted on the rental agreement. If the car is returned with less fuel, the fuel cost will be charged. With average fuel prices at an all-time high in Greece, the minimum refueling charge is 20.00 Euros. No refund is given for any additional unused fuel.',
  },
  {
    id: 8,
    category: 'Rental Conditions',
    question: 'Can I take the car on an island without paying additional fees?',
    answer: 'Our offer includes free and pre-authorized permission to ferry the car to all Greek islands. No additional documentation is needed. Ferry insurance is also included in our quotes.',
  },
  {
    id: 9,
    category: 'Rental Conditions',
    question: 'Can I drive across the Greek borders?',
    answer: 'Unfortunately, crossing the Greek borders is not allowed with an ACR vehicle.',
  },
  {
    id: 10,
    category: 'Drivers & Documents',
    question: 'Do I have to pay a fee for additional drivers?',
    answer: 'No! Our offer includes additional drivers, as long as they have all the required documentation and are at least 23 years of age.',
  },
  {
    id: 11,
    category: 'Drivers & Documents',
    question: 'Do you provide extras such as GPS systems or child seats?',
    answer: 'GPS systems, baby seats and booster seats can be provided for an additional fee of 20.00 to 30.00 Euros each, depending on the duration of the rental. (For child seats, you will be required to tell us the age and weight of the child / children.)',
  },
  {
    id: 12,
    category: 'Pick-up & Return',
    question: 'Can you deliver or collect the car at another location, away from the airport?',
    answer: 'Yes, we can deliver or collect the car at another location in Athens for an additional fee (starting from 30.00 Euros, and higher depending on the location). For rentals shorter than 5 days, we cannot deliver or collect cars outside the airport area. In this case, delivery and collection can be arranged free of charge at the airport or at Koropi Metro Station.',
  },
  {
    id: 13,
    category: 'Pick-up & Return',
    question: 'How early or late can we schedule the pick-up / return at the airport?',
    answer: 'Delivery or collection at the airport can be arranged 24/7 by appointment. Between 23:00 and 07:00 a small after-hours fee applies. For locations outside Athens Airport, delivery / collection can be arranged between 07:00 and 21:00.',
  },
  {
    id: 14,
    category: 'Pick-up & Return',
    question: 'I will pick up early in the morning and return the car in the evening. Will I be charged an extra day?',
    answer: 'No, not if the time difference between delivery and collection is 3 hours or less. If the difference is more than 3 hours, it is counted as an extra rental day.',
  },
  {
    id: 15,
    category: 'Rental Conditions',
    question: 'Is ACR able to guarantee the exact car I requested?',
    answer: 'We can secure a car from the selected category for the requested period (same size, same transmission type), but we cannot guarantee an exact model in categories where more than one model is listed. Your preference will be noted and set as a priority.',
  },
  {
    id: 16,
    category: 'Rental Conditions',
    question: 'What is the approximate age of your vehicles?',
    answer: 'Our agency always strives for a renewed fleet, with cars that are on average 18 months old and a maximum age of 5 years, with no compromise on the quality of our services. ACR does not follow the increase to 14 years of the maximum permitted age for rental cars under the G.T.O. directive.',
  },
  {
    id: 17,
    category: 'Insurance & Deposit',
    question: 'Is a deposit required to book a vehicle?',
    answer: 'A small down payment is required to finalize the reservation (starting from 50.00 Euros, usually 10–15% of the total agreed rental amount; the exact amount is stated in our quote). The deposit can be paid through our secure online payment system. Please use a browser such as Google Chrome or Mozilla Firefox, with cookies enabled.',
  },
  {
    id: 18,
    category: 'Payment & Cancellation',
    question: 'My trip is cancelled. Do I have to pay a cancellation fee?',
    answer: 'You will not be charged any penalty fees. The deposit is refunded in full if we are informed at least 7 days before your scheduled arrival for small and medium cars, or at least 15 days for SUVs and minivans. The deposit is not refundable if, at delivery, the renter is missing the mandatory documents or does not meet the requirements of the rental conditions and this FAQ. Availability is guaranteed for the confirmed dates and times. In case of last-minute changes (flight or ferry cancellation, different arrival date, etc.), amending or extending the reservation beyond the confirmed drop-off date is not guaranteed, and rental charges are calculated from the confirmed delivery date.',
  },
  {
    id: 19,
    category: 'Payment & Cancellation',
    question: 'Can I extend or shorten my reservation, during the rental or a few days before delivery?',
    answer: 'Yes, you can shorten or extend your rental, but please note that the daily rate depends on the total number of rental days. We appreciate being informed of any changes ahead of your arrival. During the summer high season we cannot guarantee that your request will be fulfilled.',
  },
  {
    id: 20,
    category: 'Payment & Cancellation',
    question: 'Can I pay with a credit / debit card?',
    answer: 'Yes. Payment with credit or debit cards can be arranged without any additional fees.',
  },
  {
    id: 21,
    category: 'Insurance & Deposit',
    question: 'Is any amount blocked / frozen on my credit card?',
    answer: `Upon your arrival we make a pre-authorization on your credit card. The pre-authorized amount corresponds to the agreed deductible. A reversal request is sent to the bank the day after the vehicle is returned. If no damage occurred during your rental, the amount is unblocked in full.

As advised by the banks:
• Credit card (Visa, MasterCard, American Express, Diners): released within 15 to 25 working days from the day the vehicle is dropped off.
• Debit card (Visa, MasterCard, Maestro): released within 60 to 90 working days from the day the vehicle is dropped off.

Our agency cannot influence this procedure in any way; processing time depends on the bank that issued the card. Even for a rental with F.D.W., this procedure remains the same for security reasons. During pre-authorization no money is taken or charged from your account. The deductible amount is only temporarily frozen, so in most cases no transaction is recorded on your statement.`,
  },
  {
    id: 22,
    category: 'Pick-up & Return',
    question: 'How do I pick up the vehicle at Athens International Airport?',
    answer: 'The pick-up takes place at our premises, a five-minute drive from Athens International Airport. Once you have collected your luggage, go to the Arrivals Hall at Door #3, where you will meet our representative holding an ACR sign. He will take you straight to our office by shuttle bus, with no waiting time. At the office he will assist you with the rental agreement, and you will have access to our customer lounge while the formalities are completed.',
  },
  {
    id: 23,
    category: 'Rental Conditions',
    question: 'What is the policy on off-road driving?',
    answer: 'ACR vehicles are strictly forbidden from being driven off-road.',
  },
  {
    id: 24,
    category: 'Accident & Rules',
    question: 'What should I do in case of an accident or mechanical failure?',
    answer: "Contact us immediately. In the glove compartment you will find a plastic envelope with our emergency contacts and the vehicle's documents. Once you contact us, we will tell you how to proceed. If the car cannot be repaired on site or nearby, we will arrange a replacement car within 24 hours. On islands, the replacement time may differ and depends on public transport schedules. In case of an accident, the event log, the police report and photos are required for any insurance claim.",
  },
  {
    id: 25,
    category: 'Pick-up & Return',
    question: 'What is the process for returning the vehicle?',
    answer: "The drop-off takes place at our premises, five minutes' drive from the airport. One of our representatives will assist you with the return and the necessary formalities. Once the return is completed, you will be taken immediately to the airport by our shuttle bus, with no waiting time.",
  },
  {
    id: 26,
    category: 'Rental Conditions',
    question: 'Must I bring the car back washed?',
    answer: 'No! You are not obliged to wash the car; the washing fee is already included in our rates. Only in extreme cases where the interior is not treated correctly (e.g. coffee, mud, sand) will you have to wash the car, to avoid fees for a possibly necessary biological cleaning.',
  },
  {
    id: 27,
    category: 'Accident & Rules',
    question: 'What happens if the police remove the license plates of my rented vehicle (illegal parking, etc.)?',
    answer: 'In case of illegal parking or any illegal action that results in the police removing the plates, the renter must pay for the additional days the plates remain in police custody, as this makes the vehicle unusable for that period and causes ACR a loss of working days. The renter must also pay any resulting fines in full.',
  },
]

export default faqData
