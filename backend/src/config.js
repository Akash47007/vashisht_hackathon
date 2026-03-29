import dotenv from "dotenv";

dotenv.config();

export const appConfig = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "super-secret-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  defaults: {
    inflationRate: Number(process.env.DEFAULT_INFLATION_RATE || 0.06),
    expectedAnnualReturnPreRetirement: Number(
      process.env.DEFAULT_PRE_RETIREMENT_RETURN || 0.1,
    ),
    expectedAnnualReturnPostRetirement: Number(
      process.env.DEFAULT_POST_RETIREMENT_RETURN || 0.05,
    ),
    yearsInRetirement: Number(process.env.DEFAULT_YEARS_IN_RETIREMENT || 30),
  },
};
