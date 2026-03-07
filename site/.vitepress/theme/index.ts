import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import CourseSearch from "../../components/CourseSearch.vue";
import FacultyBrowser from "../../components/FacultyBrowser.vue";

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component("CourseSearch", CourseSearch);
    app.component("FacultyBrowser", FacultyBrowser);
  }
};

export default theme;
