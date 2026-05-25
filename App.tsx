import "./global.css";

import RootApp from "@/core/RootApp";
import { applyScrollViewDefaults } from "@/setupScrollDefaults";
import { bootstrapSpotterPersistence } from "@/store/spotterPersistence";

applyScrollViewDefaults();
void bootstrapSpotterPersistence();

export default RootApp;
