export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === "true";
}
