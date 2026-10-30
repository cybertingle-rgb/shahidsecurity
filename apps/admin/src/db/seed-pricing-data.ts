import 'dotenv/config';
import { seedPricingData } from '../lib/pricing/seedPricingData';

/**
 * CLI entry point for a host with shell access — see
 * src/lib/pricing/seedPricingData.ts for what this actually does. Run
 * as: pnpm db:seed-pricing
 */
async function main() {
  const result = await seedPricingData();
  console.log(`Created ${result.plansCreated.length} pricing plan(s): ${result.plansCreated.join(', ') || '(none — already seeded)'}`);
  console.log(`Created ${result.addOnsCreated.length} add-on service(s): ${result.addOnsCreated.join(', ') || '(none — already seeded)'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
