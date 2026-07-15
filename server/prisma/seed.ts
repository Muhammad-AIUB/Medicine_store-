/**
 * Idempotent seed: ~100 OTC SKUs + initial admin user.
 *
 * PLACEHOLDER PRICES: amounts approximate Bangladeshi retail but are NOT
 * sourced. The design doc gates launch on real sourced prices (Dependency:
 * "supply answer blocks launch; build proceeds on placeholders").
 * Manufacturer names are best-effort and must be verified when sourcing.
 *
 * Catalog families reflect what the 10 interviews should refine — replace
 * or reweight based on what real people actually buy monthly.
 */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// [name, genericName, manufacturer, strength, dosageForm, packUnit, category, priceBdt, stock]
type Row = [string, string, string, string, string, string, string, number, number];

const rows: Row[] = [
  // --- Fever & Pain ---
  ["Napa", "Paracetamol", "Beximco", "500mg", "Tablet", "strip of 10", "Fever & Pain", 12, 120],
  ["Napa Extra", "Paracetamol + Caffeine", "Beximco", "500mg+65mg", "Tablet", "strip of 10", "Fever & Pain", 25, 100],
  ["Napa Syrup", "Paracetamol", "Beximco", "120mg/5ml", "Syrup", "60ml bottle", "Fever & Pain", 35, 60],
  ["Napa Extend", "Paracetamol", "Beximco", "665mg", "Tablet", "strip of 10", "Fever & Pain", 30, 80],
  ["Ace", "Paracetamol", "Square", "500mg", "Tablet", "strip of 10", "Fever & Pain", 12, 120],
  ["Ace Plus", "Paracetamol + Caffeine", "Square", "500mg+65mg", "Tablet", "strip of 10", "Fever & Pain", 25, 80],
  ["Ace Syrup", "Paracetamol", "Square", "120mg/5ml", "Syrup", "60ml bottle", "Fever & Pain", 35, 50],
  ["Fast", "Paracetamol", "Acme", "500mg", "Tablet", "strip of 10", "Fever & Pain", 12, 90],
  ["Renova", "Paracetamol", "Opsonin", "500mg", "Tablet", "strip of 10", "Fever & Pain", 12, 60],
  ["Reset", "Paracetamol", "Incepta", "500mg", "Tablet", "strip of 10", "Fever & Pain", 12, 60],

  // --- Gastric & Digestion (OTC antacids) ---
  ["Entacyd Plus", "Antacid (Al+Mg+Simethicone)", "Square", "", "Chewable Tablet", "strip of 10", "Gastric", 20, 100],
  ["Entacyd Plus Suspension", "Antacid (Al+Mg+Simethicone)", "Square", "", "Suspension", "200ml bottle", "Gastric", 120, 60],
  ["Antacid Plus", "Antacid", "ACME", "", "Chewable Tablet", "strip of 10", "Gastric", 18, 80],
  ["Flatameal DS", "Antacid + Simethicone", "Aristopharma", "", "Suspension", "200ml bottle", "Gastric", 130, 40],
  ["Avolac", "Lactulose", "ACI", "", "Solution", "100ml bottle", "Gastric", 155, 30],
  ["Isabgol Bhushi", "Psyllium Husk", "Local", "", "Powder", "100g pack", "Gastric", 120, 40],

  // --- Rehydration & Energy ---
  ["ORSaline-N", "Oral Rehydration Salts", "SMC", "", "Powder Sachet", "box of 10 sachets", "Rehydration", 65, 200],
  ["ORSaline Fruity", "Oral Rehydration Salts (Orange)", "SMC", "", "Powder Sachet", "box of 10 sachets", "Rehydration", 80, 100],
  ["Taste Me Saline", "Oral Rehydration Salts", "SMC", "", "Powder Sachet", "box of 10 sachets", "Rehydration", 75, 80],
  ["Gluco-D", "Glucose with Vitamin D", "Nutriplus", "", "Powder", "400g jar", "Rehydration", 150, 40],

  // --- Vitamins & Supplements ---
  ["Ceevit", "Vitamin C", "Square", "250mg", "Chewable Tablet", "strip of 10", "Vitamins", 27, 120],
  ["Ceevit DS", "Vitamin C", "Square", "500mg", "Chewable Tablet", "strip of 10", "Vitamins", 45, 80],
  ["Vasco", "Vitamin C", "ACI", "250mg", "Chewable Tablet", "strip of 10", "Vitamins", 25, 60],
  ["Calbo", "Calcium Carbonate", "Square", "500mg", "Tablet", "strip of 10", "Vitamins", 40, 80],
  ["Calbo-D", "Calcium + Vitamin D3", "Square", "500mg+200IU", "Tablet", "strip of 15", "Vitamins", 90, 80],
  ["Ostocal D", "Calcium + Vitamin D3", "Eskayef", "500mg+200IU", "Tablet", "strip of 15", "Vitamins", 90, 60],
  ["D-Rise", "Vitamin D3", "Eskayef", "2000IU", "Oral Sachet", "box of 10 sachets", "Vitamins", 200, 40],
  ["Filwel Gold", "Multivitamin & Mineral", "Eskayef", "", "Tablet", "strip of 15", "Vitamins", 130, 60],
  ["Aristovit M", "Multivitamin", "Aristopharma", "", "Tablet", "strip of 10", "Vitamins", 35, 60],
  ["Zinc 20", "Zinc Sulphate", "Square", "20mg", "Tablet", "strip of 10", "Vitamins", 30, 80],
  ["Folic Acid", "Folic Acid", "Beximco", "5mg", "Tablet", "strip of 10", "Vitamins", 15, 60],

  // --- First Aid & Antiseptic ---
  ["Savlon Liquid", "Chloroxylenol Antiseptic", "ACI", "", "Liquid", "100ml bottle", "First Aid", 55, 80],
  ["Savlon Liquid Large", "Chloroxylenol Antiseptic", "ACI", "", "Liquid", "500ml bottle", "First Aid", 190, 40],
  ["Savlon Antiseptic Cream", "Antiseptic Cream", "ACI", "", "Cream", "30g tube", "First Aid", 60, 60],
  ["Dettol Liquid", "Chloroxylenol Antiseptic", "Reckitt", "", "Liquid", "100ml bottle", "First Aid", 90, 60],
  ["Dettol Liquid Large", "Chloroxylenol Antiseptic", "Reckitt", "", "Liquid", "250ml bottle", "First Aid", 190, 30],
  ["Viodin Ointment", "Povidone Iodine", "Square", "10%", "Ointment", "15g tube", "First Aid", 45, 60],
  ["Burnsil Cream", "Silver Sulfadiazine", "Square", "1%", "Cream", "25g tube", "First Aid", 90, 30],
  ["First Aid Bandage", "Adhesive Bandage", "Beximco", "", "Strips", "box of 20", "First Aid", 40, 100],
  ["Cotton Roll", "Absorbent Cotton", "Local", "", "Roll", "50g roll", "First Aid", 35, 80],
  ["Gauze Bandage", "Gauze", "Local", "", "Roll", "4m roll", "First Aid", 25, 80],
  ["Micropore Tape", "Surgical Tape", "3M", "", "Tape", "1 inch roll", "First Aid", 60, 60],
  ["Crepe Bandage", "Elastic Bandage", "Local", "", "Roll", "4 inch roll", "First Aid", 120, 40],
  ["Hexisol Hand Rub", "Alcohol Hand Antiseptic", "ACI", "", "Solution", "100ml bottle", "First Aid", 70, 80],
  ["Hand Sanitizer", "Alcohol Sanitizer", "Square Toiletries", "", "Gel", "50ml bottle", "First Aid", 50, 100],

  // --- Cough, Cold & Throat (OTC/herbal) ---
  ["Adovas Syrup", "Herbal Cough Syrup (Adhatoda)", "Square", "", "Syrup", "100ml bottle", "Cough & Cold", 75, 60],
  ["Basok Syrup", "Herbal Cough Syrup (Basok)", "Hamdard", "", "Syrup", "100ml bottle", "Cough & Cold", 60, 40],
  ["Tulsi Cough Syrup", "Herbal Cough Syrup (Tulsi)", "Hamdard", "", "Syrup", "100ml bottle", "Cough & Cold", 65, 40],
  ["Vicks VapoRub", "Camphor + Menthol Rub", "P&G", "", "Ointment", "25g jar", "Cough & Cold", 130, 60],
  ["Vicks VapoRub Small", "Camphor + Menthol Rub", "P&G", "", "Ointment", "12g jar", "Cough & Cold", 75, 60],
  ["Strepsils", "Medicated Lozenge", "Reckitt", "", "Lozenge", "strip of 8", "Cough & Cold", 60, 80],
  ["Menthol Lozenge", "Menthol Lozenge", "Local", "", "Lozenge", "strip of 8", "Cough & Cold", 30, 80],
  ["Norsol Nasal Drop", "Sodium Chloride 0.9%", "Beximco", "0.9%", "Nasal Drop", "10ml bottle", "Cough & Cold", 30, 60],

  // --- Baby Care ---
  ["Johnson's Baby Powder", "Baby Talc", "Johnson & Johnson", "", "Powder", "100g bottle", "Baby Care", 160, 40],
  ["Johnson's Baby Lotion", "Baby Lotion", "Johnson & Johnson", "", "Lotion", "100ml bottle", "Baby Care", 220, 30],
  ["Johnson's Baby Oil", "Baby Oil", "Johnson & Johnson", "", "Oil", "100ml bottle", "Baby Care", 220, 30],
  ["Johnson's Baby Soap", "Baby Soap", "Johnson & Johnson", "", "Soap", "75g bar", "Baby Care", 90, 60],
  ["Baby Feeding Bottle", "Feeding Bottle", "Local", "", "Bottle", "250ml", "Baby Care", 180, 30],
  ["Baby Zinc Syrup", "Zinc Sulphate", "Square", "10mg/5ml", "Syrup", "100ml bottle", "Baby Care", 45, 40],

  // --- Skin & Personal Care ---
  ["Vaseline Petroleum Jelly", "Petroleum Jelly", "Unilever", "", "Jelly", "50ml jar", "Skin Care", 90, 60],
  ["Boro Plus", "Antiseptic Cream", "Emami", "", "Cream", "40ml tube", "Skin Care", 85, 60],
  ["Meril Baby Lotion", "Moisturizing Lotion", "Square Toiletries", "", "Lotion", "100ml bottle", "Skin Care", 120, 40],
  ["Calamine Lotion", "Calamine", "Square", "", "Lotion", "100ml bottle", "Skin Care", 80, 40],
  ["Sunscreen SPF50", "Sunscreen", "Square Toiletries", "SPF50", "Cream", "50g tube", "Skin Care", 350, 20],

  // --- Oral Care ---
  ["Sensodyne Toothpaste", "Desensitizing Toothpaste", "Haleon", "", "Paste", "70g tube", "Oral Care", 220, 40],
  ["Listerine Mouthwash", "Antiseptic Mouthwash", "Kenvue", "", "Mouthwash", "250ml bottle", "Oral Care", 260, 30],
  ["Dologel Oral Gel", "Choline Salicylate", "Beximco", "", "Gel", "10g tube", "Oral Care", 55, 40],

  // --- Feminine Hygiene ---
  ["Senora Regular", "Sanitary Napkin", "Square Toiletries", "", "Napkin", "pack of 10", "Feminine Care", 130, 60],
  ["Freedom Regular", "Sanitary Napkin", "ACI", "", "Napkin", "pack of 10", "Feminine Care", 120, 60],
  ["Joya Regular", "Sanitary Napkin", "Bashundhara", "", "Napkin", "pack of 10", "Feminine Care", 110, 60],

  // --- Devices & Diagnostics ---
  ["Digital Thermometer", "Clinical Thermometer", "Omron", "", "Device", "1 unit", "Devices", 250, 30],
  ["BP Monitor", "Digital Blood Pressure Monitor", "Omron", "M2", "Device", "1 unit", "Devices", 3800, 8],
  ["Pulse Oximeter", "Fingertip Oximeter", "Generic", "", "Device", "1 unit", "Devices", 900, 15],
  ["Glucometer", "Blood Glucose Monitor", "On Call", "Plus", "Device", "1 unit", "Devices", 1600, 10],
  ["Glucometer Strips", "Glucose Test Strips", "On Call", "Plus", "Strips", "box of 25", "Devices", 700, 30],
  ["Hot Water Bag", "Hot Water Bottle", "Generic", "", "Device", "1 unit", "Devices", 350, 20],
  ["Nebulizer Machine", "Compressor Nebulizer", "Omron", "NE-C101", "Device", "1 unit", "Devices", 3500, 5],
  ["Surgical Face Mask", "3-Ply Mask", "Local", "", "Mask", "box of 50", "Devices", 150, 60],
  ["KN95 Mask", "KN95 Respirator", "Generic", "", "Mask", "pack of 5", "Devices", 200, 40],

  // --- Mosquito & Household Health ---
  ["Odomos Cream", "Mosquito Repellent", "Dabur", "", "Cream", "50g tube", "Household", 120, 40],
  ["Mosquito Coil", "Repellent Coil", "ACI", "", "Coil", "box of 10", "Household", 60, 60],
];

// Rx-flagged examples: kept in the DATABASE to prove the flag works, but the
// public API filters them out (premise 2 — never shown on the storefront).
const rxRows: Row[] = [
  ["Seclo", "Omeprazole", "Square", "20mg", "Capsule", "strip of 10", "Gastric", 60, 0],
  ["Losectil", "Omeprazole", "Eskayef", "20mg", "Capsule", "strip of 10", "Gastric", 60, 0],
];

async function main() {
  let created = 0;
  for (const [name, genericName, manufacturer, strength, dosageForm, packUnit, category, priceBdt, stock] of rows) {
    await prisma.product.upsert({
      where: { name_strength_packUnit: { name, strength, packUnit } },
      update: {},
      create: {
        name,
        genericName,
        brand: name,
        manufacturer,
        strength,
        dosageForm,
        packUnit,
        category,
        pricePaisa: Math.round(priceBdt * 100),
        stockQty: stock,
        isPrescriptionRequired: false,
        isActive: true,
      },
    });
    created++;
  }

  for (const [name, genericName, manufacturer, strength, dosageForm, packUnit, category, priceBdt, stock] of rxRows) {
    await prisma.product.upsert({
      where: { name_strength_packUnit: { name, strength, packUnit } },
      update: {},
      create: {
        name,
        genericName,
        brand: name,
        manufacturer,
        strength,
        dosageForm,
        packUnit,
        category,
        pricePaisa: Math.round(priceBdt * 100),
        stockQty: stock,
        isPrescriptionRequired: true,
        isActive: true,
      },
    });
    created++;
  }

  const email = process.env.ADMIN_EMAIL ?? "admin@medistore.local";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-admin";
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await bcrypt.hash(password, 10) },
  });

  console.log(`Seeded ${created} products (+1 admin: ${email}). Prices are PLACEHOLDERS — source real prices before launch.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
