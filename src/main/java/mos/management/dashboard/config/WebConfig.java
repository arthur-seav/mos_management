package mos.management.dashboard.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;

/**
 * Serves the React dashboard (built into classpath:/static), uploaded
 * product pictures and the bundled demo photos. Unknown non-API paths get index.html, so the
 * dashboard's own routes (/orders, /menu/products...) survive a reload.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final MosProperties properties;

    public WebConfig(MosProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploads = Path.of(properties.uploadDir()).toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/uploads/**").addResourceLocations(uploads);
        // Photos for the demo menu, shipped in the jar (src/main/resources/demo/images).
        registry.addResourceHandler("/demo-images/**").addResourceLocations("classpath:/demo/images/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic());

        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String path, Resource location) throws IOException {
                        Resource found = location.createRelative(path);
                        if (found.exists() && found.isReadable()) return found;
                        if (path.startsWith("api/") || path.startsWith("actuator") || path.startsWith("uploads/")
                                || path.startsWith("demo-images/")) {
                            return null;
                        }
                        Resource index = new ClassPathResource("/static/index.html");
                        return index.exists() ? index : null;
                    }
                });
    }
}
