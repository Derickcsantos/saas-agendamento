import Router from "express";
import {
  getOrganizationPolicies,
  updateOrganizationPolicies,
} from "../controllers/organizationPoliciesController.js";

export const organizationPoliciesRouter = Router();

organizationPoliciesRouter.get("/:slug", getOrganizationPolicies);
organizationPoliciesRouter.put("/:slug", updateOrganizationPolicies);

