import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`FlowLedger API running on port ${config.port} [${config.env}]`);
});
