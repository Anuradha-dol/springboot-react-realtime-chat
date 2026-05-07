package com.yourname.chatapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String baseLocation = toFileUri(uploadBaseDir);
        registry.addResourceHandler("/uploads/profile/**")
            .addResourceLocations(baseLocation + "profile/");
        registry.addResourceHandler("/uploads/cover/**")
            .addResourceLocations(baseLocation + "cover/");
        registry.addResourceHandler("/uploads/group/**")
            .addResourceLocations(baseLocation + "group/");
    }

    private String toFileUri(String baseDir) {
        Path path = Paths.get(baseDir).toAbsolutePath().normalize();
        String uri = path.toUri().toString();
        return uri.endsWith("/") ? uri : uri + "/";
    }
}
