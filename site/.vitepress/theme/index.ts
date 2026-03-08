import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import InstitutionsBrowser from "../../components/InstitutionsBrowser.vue";
import LecturesBrowser from "../../components/LecturesBrowser.vue";
import SponsorCard from "../../components/SponsorCard.vue";
import "./custom.css";

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component("InstitutionsBrowser", InstitutionsBrowser);
    app.component("LecturesBrowser", LecturesBrowser);
    app.component("SponsorCard", SponsorCard);
  }
};

export default theme;
