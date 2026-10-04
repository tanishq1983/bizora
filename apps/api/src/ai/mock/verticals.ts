/**
 * Vertical definitions.
 *
 * The fallback provider needs to produce output that reads as specific to the
 * founder's idea, not as a template. Rather than inventing structure, it first
 * classifies the idea into a vertical and then draws on real companies, real
 * market triggers and plausible cost ranges for that vertical.
 */

export interface VerticalCompetitor {
  name: string;
  strengths: string[];
  gaps: string[];
}

export interface Vertical {
  match: RegExp;
  /** Human label for the market, e.g. "education and career development". */
  market: string;
  /** Concrete user segments, most specific first. */
  audiences: string[];
  /** The shift that makes the idea timely — reused for "why now" support. */
  technologyShift: string;
  marketNeed: string;
  competitors: VerticalCompetitor[];
  revenueStreams: string[];
  monetizationModel: string;
  growthAreas: string[];
  buildCost: string;
  operatingCost: string;
  currency: string;
  /** Baseline quality of the underlying idea in this vertical, before noise. */
  baseScores: {
    marketPotential: number;
    problemSolutionFit: number;
    innovation: number;
    feasibility: number;
    revenuePotential: number;
  };
}

export const VERTICALS: readonly Vertical[] = [
  {
    match: /student|college|university|internship|career|graduat|school|campus|skill(s)?[- ]building|learning platform/i,
    market: 'education, career development and student employability',
    audiences: [
      'undergraduate students in their second and third year',
      'career services teams at mid-sized colleges',
      'students from tier-2 and tier-3 institutions',
      'bootcamp and skill-training providers',
      'early-career recruiters hiring interns',
    ],
    technologyShift:
      'LLM-based matching has only recently become cheap and fast enough to score a student profile against a role in real time, and the cost per inference has fallen far enough that a consumer-scale product can absorb it.',
    marketNeed:
      'Students apply to large numbers of internships with poorly targeted, largely identical applications, while employers screen hundreds of near-identical CVs. Both sides are short on signal, and internship marketplaces have not solved matching because they optimise for volume of listings rather than fit.',
    competitors: [
      {
        name: 'Internshala',
        strengths: ['Large internship listing volume in India', 'Strong student brand recognition', 'Free listings for employers'],
        gaps: ['Matching is keyword-based rather than personalised', 'Little signal on whether a student is actually a good fit', 'Heavy volume, thin guidance'],
      },
      {
        name: 'LinkedIn',
        strengths: ['Professional network effects', 'Recruiter reach and established trust', 'Rich hiring infrastructure'],
        gaps: ['Requires an existing profile before it is useful', 'Optimised for experienced roles, not first internships', 'Paywalled features for students'],
      },
      {
        name: 'Handshake',
        strengths: ['Direct university partnerships', 'Institution-level distribution', 'Event and career fair tooling'],
        gaps: ['Campus-only, so students outside the partner network are excluded', 'Weak personalisation in recommendations', 'Limited coverage outside North America'],
      },
      {
        name: 'Naukri',
        strengths: ['Dominant recruiter network in the region', 'Enormous employer demand', 'Proven monetisation at scale'],
        gaps: ['Built for full-time roles, not internships', 'No skill-gap analysis or learning pathway', 'Transactional rather than developmental'],
      },
    ],
    revenueStreams: [
      'Subscription for students seeking structured placement support',
      'Institutional licences sold to college career services departments',
      'Recruiter-side candidate access and shortlist credits',
      'Sponsored skill-bootcamp partnerships with a revenue share',
    ],
    monetizationModel:
      'Free for students as the acquisition channel, paid per seat on an annual institutional contract to universities, with a separate per-candidate credit model for recruiters. Institutional contracts are the durable revenue because they renew annually and are budgeted from an existing career services line.',
    growthAreas: [
      'Alumni networks and working professionals seeking a next role',
      'Vocational and skill-training institutes rather than degree colleges',
      'International student recruitment for overseas universities',
      'Employer-sponsored upskilling for existing staff',
    ],
    buildCost: '₹8L – ₹18L for a credible first version with real matching, built by 2–3 engineers over 4–6 months',
    operatingCost: '₹40K – ₹90K per month at launch, rising toward ₹2.5L per month at roughly 50,000 monthly active students, driven mainly by inference and hosting',
    currency: 'INR',
    baseScores: { marketPotential: 82, problemSolutionFit: 74, innovation: 58, feasibility: 76, revenuePotential: 68 },
  },
  {
    match: /food|waste|restaurant|grocery|agri|farm|surplus|cafe|dish|meal/i,
    market: 'food service, food waste reduction and secondary food retail',
    audiences: [
      'independent restaurants with daily surplus',
      'supermarkets and grocery chains',
      'consumers looking for discounted food near them',
      'food banks and community charities',
      'hospital and institutional canteen operators',
    ],
    technologyShift:
      'Demand forecasting at low inference cost, combined with cheap and reliable same-day logistics networks, has only recently made dynamic surplus pricing and pickup routing practical for small operators.',
    marketNeed:
      'A meaningful share of prepared food is discarded while food-insecure households nearby cannot access it, and the logistics of matching the two at sub-daily granularity have historically been uneconomic for small operators.',
    competitors: [
      {
        name: 'Too Good To Go',
        strengths: ['Strong brand and consumer awareness in Europe', 'Proven partner operations model', 'Large volume of daily surplus listings'],
        gaps: ['Geographically concentrated in Western Europe', 'Fixed-time "Surprise Bags" offer limited choice', 'Partner pricing power sits with the platform'],
      },
      {
        name: 'Flashfood',
        strengths: ['Purpose-built logistics for surplus inventory', 'Retail and grocery partnerships at scale', 'Hardware and operations capability competitors lack'],
        gaps: ['Requires significant grocery supply chain integration', 'Slow to launch in new markets', 'Focused on grocery rather than prepared food'],
      },
      {
        name: 'Food Rescue Hero',
        strengths: ['Charity-first positioning', 'Volunteer network for collection', 'Strong NGO credibility'],
        gaps: ['Volunteer-dependent, so coverage is inconsistent', 'Limited technology in the matching layer', 'Hard to monetise'],
      },
    ],
    revenueStreams: [
      'Margin on each surplus item resold at a discount',
      'Subscription for restaurants on priority pickup windows',
      'Reporting and compliance tooling for grocery chains',
      'Brand and retailer sponsored "rescue" campaigns',
    ],
    monetizationModel:
      'Take rate on every transaction, combined with a monthly subscription that guarantees a collection slot. The take rate covers logistics; the subscription makes revenue predictable enough for restaurants to treat it as a fixed cost line.',
    growthAreas: [
      'Institutional and canteen contracts',
      'Cold-chain surplus and frozen inventory',
      'Corporate employee meal benefits',
      'Cross-border expansion into underserved city clusters',
    ],
    buildCost: '₹12L – ₹25L including the routing and partner operations tooling',
    operatingCost: '₹1.2L – ₹3L per month at launch, heavily weighted toward last-mile collection logistics',
    currency: 'INR',
    baseScores: { marketPotential: 78, problemSolutionFit: 80, innovation: 62, feasibility: 58, revenuePotential: 72 },
  },
  {
    match: /freelance|contract|invoice|client|agency|consultant|independent contractor/i,
    market: 'freelance services, contracting and professional services tooling',
    audiences: [
      'independent freelancers and contractors',
      'small creative and development agencies',
      'agencies hiring fractional or contract staff',
      'freelance platforms seeking higher trust',
      'accounting firms serving the self-employed',
    ],
    technologyShift:
      'Language models can now review contract language at a cost and latency that makes a per-document review viable, which was not true a few years ago.',
    marketNeed:
      'Freelancers routinely sign terms they do not fully understand — late payment clauses, IP assignment, kill fees — and discover the consequences only after the money is disputed.',
    competitors: [
      {
        name: 'HoneyBook',
        strengths: ['All-in-one practice management suite', 'Strong freelancer habit', 'Robust template library'],
        gaps: ['Contract review is not the product', 'Pricing opaque and rising', 'Built for service businesses, not independents'],
      },
      {
        name: 'Clause',
        strengths: ['Legal templates with lawyer input', 'Broad contract coverage', 'Trusted legal positioning'],
        gaps: ['Manual template selection, no automated review', 'US-centric legal jurisdiction', 'Costs are prohibitive for early-career freelancers'],
      },
      {
        name: 'Upwork',
        strengths: ['Dominant talent marketplace', 'Built-in payment protection', 'Large existing supply of freelancers'],
        gaps: ['Weak at protecting the freelancer', 'High take rate', 'Contract terms are largely boilerplate and unenforced'],
      },
    ],
    revenueStreams: [
      'Per-document review for individual freelancers',
      'Monthly unlimited plan for professionals',
      'Agency dashboard with team-level contract tracking',
      'Referral fee to accounting and legal partners',
    ],
    monetizationModel:
      'Freemium per-document pricing with a monthly unlimited tier for frequent freelancers, and a higher-priced team plan for agencies. The per-document entry point removes the subscription objection for someone sending their first invoice.',
    growthAreas: [
      'Indian and UK legal jurisdictions',
      'Accounting and payroll partner integrations',
      'Agency white-labeling the review engine',
      'Pre-signing review as an API for contract platforms',
    ],
    buildCost: '₹6L – ₹14L for a document-review first version with a credible rule and model layer',
    operatingCost: '₹30K – ₹1.1L per month at launch, dominated by inference per document',
    currency: 'INR',
    baseScores: { marketPotential: 71, problemSolutionFit: 77, innovation: 55, feasibility: 84, revenuePotential: 66 },
  },
  {
    match: /fintech|payment|invoice|budget|expense|bank|credit|lending|insur|tax|accounting/i,
    market: 'financial services and personal finance software',
    audiences: [
      'freelancers and sole traders with irregular income',
      'first-time investors',
      'small business owners without a finance hire',
      'financially underserved young adults',
      'independent advisers and bookkeepers',
    ],
    technologyShift:
      'Real-time payment rails and open banking access have become broadly available, so automated categorisation and reconciliation that once required manual data entry can now run continuously.',
    marketNeed:
      'Irregular income and thin financial infrastructure leave a large group unable to plan, budget or qualify for mainstream financial products.',
    competitors: [
      {
        name: 'Mint',
        strengths: ['Automatic account aggregation', 'Trusted brand and long operating history', 'Free tier that removed the paywall objection'],
        gaps: ['Sunset as an independent product', 'No action layer, only categorisation', 'US-only banking integrations'],
      },
      {
        name: 'Cleo',
        strengths: ['Conversational onboarding for new users', 'Strong brand with younger demographics', 'Effective spend categorisation'],
        gaps: ['Opaque about how advice is generated', 'Limited real financial product depth', 'Thin on genuine planning'],
      },
      {
        name: 'Zerodha Console',
        strengths: ['Strong domestic brokerage trust', 'Excellent analytics depth', 'Low transaction costs'],
        gaps: ['Brokerage-first, so no cash-flow planning', 'Requires existing investing habit', 'Investments rather than income management'],
      },
    ],
    revenueStreams: [
      'Monthly subscription for premium planning features',
      'Referral fee on financial products opened through the platform',
      'B2B licence to employers for financial wellness benefits',
      'Premium one-off deep financial reviews',
    ],
    monetizationModel:
      'Monthly subscription with a free tier that handles categorisation and a paid tier adding forecasting and goal tracking, monetised further through referral economics. Referral revenue typically does not materialise until usage is high, so subscription is the primary driver.',
    growthAreas: [
      'Employer financial wellness programmes',
      'Tax filing and compliance add-ons',
      'Creator and gig-worker income streams',
      'Regional expansion across non-US banking rails',
    ],
    buildCost: '₹10L – ₹22L including compliance considerations and bank integrations',
    operatingCost: '₹80K – ₹2L per month, including compliance and support costs',
    currency: 'INR',
    baseScores: { marketPotential: 85, problemSolutionFit: 70, innovation: 52, feasibility: 62, revenuePotential: 78 },
  },
  {
    match: /health|fitness|mental health|therapy|wellness|clinic|patient|medical|doctor|diet|nutrition|caregiver/i,
    market: 'healthcare, wellness and care delivery',
    audiences: [
      'patients managing a chronic condition at home',
      'primary care clinics with constrained scheduling capacity',
      'employers offering mental health benefits',
      'caregivers coordinating support for a relative',
      'independent physiotherapy and wellness practitioners',
    ],
    technologyShift:
      'Clinical-grade language models and reliable remote monitoring hardware have reached a point where structured care guidance can be delivered outside a clinic with defensible accuracy.',
    marketNeed:
      'Most care happens between appointments, and that entire period is unsupported. Clinicians have no visibility, and patients have no guidance at the moment they most need it.',
    competitors: [
      {
        name: 'Teladoc',
        strengths: ['Established virtual care infrastructure', 'Insurance payer relationships', 'Clinical credibility'],
        gaps: ['Episodic rather than continuous care', 'Poor ongoing engagement', 'High cost relative to outcome'],
      },
      {
        name: 'Woebot Health',
        strengths: ['Pioneered AI mental health support', 'Strong clinical research base', 'Low marginal cost of delivery'],
        gaps: ['Narrow scope', 'Weak clinician integration', 'Engagement drops sharply after the first month'],
      },
      {
        name: 'Headspace',
        strengths: ['Excellent consumer experience', 'Large content library', 'Strong employer channel'],
        gaps: ['Self-help rather than clinical care', 'Low clinical intensity', 'Subscription fatigue in the category'],
      },
    ],
    revenueStreams: [
      'Employer subscription priced per covered employee',
      'Clinic licence for patient monitoring dashboards',
      'Premium consumer tier for personalised programmes',
      'Outcomes-based payment from insurers for reduced admissions',
    ],
    monetizationModel:
      'Sold to employers and clinics rather than direct to consumers, because both have budget lines and measurable outcomes. The long sales cycle is the main risk to this model.',
    growthAreas: [
      'Post-discharge care pathways',
      'Paediatric and geriatric care',
      'Insurance-led chronic disease management',
      'Caregiver support as a distinct product',
    ],
    buildCost: '₹20L – ₹45L once clinical review, compliance and validation are accounted for',
    operatingCost: '₹3L – ₹9L per month, with regulatory and clinical advisory costs that do not scale down',
    currency: 'INR',
    baseScores: { marketPotential: 88, problemSolutionFit: 82, innovation: 60, feasibility: 45, revenuePotential: 74 },
  },
  {
    match: /developer|code|coding|devops|api|engineer|software|saas|productivity|workspace|note|task|project|team|collaborat/i,
    market: 'developer tools and workplace software',
    audiences: [
      'small software teams',
      'independent developers and technical founders',
      'engineering managers',
      'agency development teams',
      'non-technical departments adopting AI tooling',
    ],
    technologyShift:
      'The cost of inference dropped far enough that per-request AI features became viable inside software products people already pay for, and developer budgets recovered from the 2023 downturn.',
    marketNeed:
      'Teams have adopted tools faster than they have rebuilt their processes around them, creating real gaps between what a tool can do and how the team actually works.',
    competitors: [
      {
        name: 'Notion',
        strengths: ['Extreme flexibility', 'Strong community template ecosystem', 'Fast iteration cadence'],
        gaps: ['Structure degrades with scale', 'Weak permissions and audit trail', 'Search becomes unreliable at volume'],
      },
      {
        name: 'Linear',
        strengths: ['Exceptional speed and keyboard-first design', 'Opinionated workflow that teams actually adopt', 'Strong developer credibility'],
        gaps: ['Deliberately limited, so adjacent problems go unserved', 'No native document layer', 'Pricing scales steeply with headcount'],
      },
      {
        name: 'Atlassian',
        strengths: ['Deep incumbency with engineering organisations', 'Powerful automation engine', 'Massive marketplace ecosystem'],
        gaps: ['Configuration complexity is a genuine tax', 'Slow to modernise the core experience', 'Bundled pricing that overcharges smaller teams'],
      },
    ],
    revenueStreams: [
      'Per-seat monthly subscription',
      'Usage-based tier for the AI feature specifically',
      'Enterprise plan with audit, SSO and admin controls',
      'Paid onboarding and migration services',
    ],
    monetizationModel:
      'Per-seat subscription with a free tier for small teams, and a metered upgrade tier for the AI capability. The free tier is the acquisition mechanism; the metering is what keeps margins intact as inference costs rise.',
    growthAreas: [
      'Enterprise compliance and governance',
      'Platform teams and internal developer portals',
      'Non-technical adjacent departments',
      'Marketplace and integration ecosystem',
    ],
    buildCost: '₹7L – ₹16L for a polished v1 built by 2 engineers',
    operatingCost: '₹50K – ₹2.2L per month at launch, rising with inference spend per active seat',
    currency: 'INR',
    baseScores: { marketPotential: 86, problemSolutionFit: 64, innovation: 48, feasibility: 88, revenuePotential: 80 },
  },
];

export const GENERIC_VERTICAL: Vertical = {
  match: /.^/,
  market: 'the market described in the idea',
  audiences: [
    'the primary segment named in the idea',
    'early adopters willing to change current behaviour',
    'organisations paying for the outcome today',
    'a secondary segment reachable through the same channels',
  ],
  technologyShift:
    'The enabling capabilities only recently became cheap and reliable enough to deliver this productively, which is what makes the idea feasible now rather than three years ago.',
  marketNeed:
    'The underlying need is already visible in how people work around the problem today, which is usually the clearest signal that the pain is real rather than assumed.',
  competitors: [
    {
      name: 'Incumbent platform',
      strengths: ['Existing user base and distribution', 'Brand trust and established relationships', 'Capital and engineering capacity'],
      gaps: ['Optimised for a legacy workflow this idea replaces', 'Slow to change core product assumptions', 'No incentive to cannibalise existing lines'],
    },
    {
      name: 'Direct specialist competitor',
      strengths: ['Narrow focus on exactly this job', 'Faster iteration cycles', 'Strong domain credibility'],
      gaps: ['Feature depth stops at the core use case', 'Limited ability to extend into adjacent problems', 'Often dependent on one channel'],
    },
    {
      name: 'Manual or spreadsheet workaround',
      strengths: ['Already paid for', 'Requires no behaviour change', 'Understood by everyone'],
      gaps: ['Does not scale past a handful of users', 'No audit trail or reliability', 'Invisible cost paid in founder time'],
    },
  ],
  revenueStreams: [
    'Subscription pricing tied to active usage',
    'A higher-priced tier with advanced controls',
    'Per-seat or per-transaction pricing for larger customers',
    'Implementation and onboarding revenue',
  ],
  monetizationModel:
    'Subscription with a free tier for evaluation and a paid tier for ongoing use. B2B is assumed to be the durable revenue line because budgets recur where individual willingness to pay does not.',
  growthAreas: [
    'Adjacent segments sharing the same underlying problem',
    'Additional geographies with the same behaviour pattern',
    'Enterprise tier once the core product is proven',
    'Adjacent products serving the same buyer',
  ],
  buildCost: '₹8L – ₹20L for a credible first version with a small team',
  operatingCost: '₹50K – ₹2.5L per month at launch, scaling with active users',
  currency: 'INR',
  baseScores: { marketPotential: 70, problemSolutionFit: 68, innovation: 52, feasibility: 74, revenuePotential: 64 },
};

export function detectVertical(idea: string): Vertical {
  for (const vertical of VERTICALS) {
    if (vertical.match.test(idea)) return vertical;
  }
  return GENERIC_VERTICAL;
}