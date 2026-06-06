# NetZero: Proactive Optimization for Homes and Businesses

NetZero is a hybrid Edge-Cloud SaaS application designed to bridge the gap between architectural design and dynamic grid energy performance. By fusing structural thermodynamic forecasting with real-time carbon intensity telemetry, NetZero provides actionable, "carbon-aware" operational scheduling for various building types.

## The Problem
Building assets often operate blindly regarding grid conditions, leading to inefficient energy consumption, the "Demand Trap," and difficulty managing carbon footprints. NetZero solves this by integrating physical building parameters (thermodynamics) with dynamic temporal data (grid intensity) to facilitate "Load-Shifting" and reduce costs during peak carbon-intensity hours.

## Target Users
* **Homeowners:** Mitigate inefficient HVAC cycling by calculating thermal inertia to maintain stable temperatures via informed ventilation and shading.
* **Small Business Owners:** Flatten the facility's carbon profile by scheduling "non-critical" thermal preparation (e.g., pre-heating ovens) during periods of lower grid intensity.
* **Facility Managers:** Maintain ESG targets through Automated Threshold Modulation, which cycles down secondary climate systems during carbon spikes.

## Key Features
* **Thermodynamic Digital Twin Onboarding:** Capture 8 structural parameters to transform a physical structure into a computable digital model.
* **Predictive Grid Intensity Analytics:** Real-time integration with the National Grid ESO API to visualize grid "cleanliness".
* **Carbon-Aware Computational Engine:** Overlays thermodynamic load predictions with grid carbon trends to determine optimal operational strategies.
* **Automated Operational Modulation:** Triggers automatic energy-saving protocols when grid carbon intensity crosses user-defined "Carbon Ceilings".

## Technology Stack
* **Backend:** Python, Django REST Framework
* **Frontend:** Next.js, Tailwind CSS, Recharts, shadcn/ui 
* **ML/Compute:** PyTorch, CoreML 
* **Infrastructure:** Supabase (PostgreSQL), GitHub Actions (CI/CD), Vercel 

## Data Sources
* **[UCI Energy Efficiency Dataset](https://archive.ics.uci.edu/dataset/242/energy+efficiency):** Used to predict heating and cooling loads based on structural attributes.
* **[Carbon Intensity API](https://carbonintensity.org.uk/):** Used for real-time and forecasted carbon intensity data.

[https://github.com/dr1810/NetZero](https://github.com/dr1810/NetZero)
README.md
Displaying README.md.
