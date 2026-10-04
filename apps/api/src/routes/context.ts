import type { AiProvider } from '../ai/provider.js';
import type { DataStore } from '../data/store.js';
import type { AuthService } from '../services/auth.service.js';
import type { BuilderService } from '../services/builder.service.js';
import type { InvestorService } from '../services/investor.service.js';
import type { ReportService } from '../services/report.service.js';

/** Everything the route layer is allowed to depend on. */
export interface AppServices {
  ai: AiProvider;
  store: DataStore;
  auth: AuthService;
  builder: BuilderService;
  investor: InvestorService;
  report: ReportService;
}