package mos.management.dashboard.config;

import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The Flutter web dev server (another localhost port) may call the app API; nobody else may. */
class CorsTest extends ApiTest {

    @Test
    void flutterWebDevOriginMayCallTheAppApi() throws Exception {
        mvc.perform(options("/api/app/orders")
                        .header("Origin", "http://localhost:53117")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:53117"));
        mvc.perform(get("/api/app/menu").header("Origin", "http://127.0.0.1:8000"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:8000"));
    }

    @Test
    void otherSitesAreRefused() throws Exception {
        mvc.perform(options("/api/app/orders")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void dashboardApiStaysSameOriginOnly() throws Exception {
        mvc.perform(options("/api/admin/auth/sign-in")
                        .header("Origin", "http://localhost:53117")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
