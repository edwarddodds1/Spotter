import "./global.css";

import RootApp from "@/core/RootApp";
import { installGlobalErrorReporter } from "@/lib/errorReporter";
import { applyScrollViewDefaults } from "@/setupScrollDefaults";
import { bootstrapSpotterPersistence } from "@/store/spotterPersistence";

applyScrollViewDefaults();
installGlobalErrorReporter();
void bootstrapSpotterPersistence();

export default RootApp;
