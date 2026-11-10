export default async function globalTeardown() {
  await globalThis.__acrRentCarE2EServices?.close();
  delete globalThis.__acrRentCarE2EServices;
}
