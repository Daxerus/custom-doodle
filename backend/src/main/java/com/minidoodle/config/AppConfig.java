package com.minidoodle.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MiniDoodleProperties.class)
public class AppConfig {
}
