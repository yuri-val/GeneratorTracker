FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    wget \
    openjdk-17-jdk \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Android SDK
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=${ANDROID_SDK_ROOT}
ENV PATH=${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools

RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O /tmp/cmdline-tools.zip && \
    unzip /tmp/cmdline-tools.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && \
    mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest && \
    rm /tmp/cmdline-tools.zip

# Accept licenses and install required SDK packages
# Expo SDK 54 requires: compileSdk 36, buildTools 36.0.0, NDK 27.1.12297006
RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"

# Set Android NDK environment variable
ENV ANDROID_NDK_HOME=${ANDROID_SDK_ROOT}/ndk/27.1.12297006

# Install Expo CLI and EAS CLI
RUN npm install -g expo-cli eas-cli

# Configure Gradle for better memory management
# - Disable Gradle daemon to avoid "daemon disappeared" crashes
# - Limit parallel workers to reduce memory pressure
# - Use G1GC for better memory handling
# - Reduced memory from 6g to 4g to prevent OOM crashes
ENV GRADLE_OPTS="-Dorg.gradle.daemon=false -Dorg.gradle.workers.max=1 -Dorg.gradle.parallel=false -Xmx4g -XX:MaxMetaspaceSize=512m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:MaxDirectMemorySize=512m"
ENV _JAVA_OPTIONS="-Xmx4g -XX:+UseG1GC"

# Limit CMake parallel jobs to reduce memory usage
ENV CMAKE_BUILD_PARALLEL_LEVEL=1

# Create gradle.properties with memory settings
RUN mkdir -p /root/.gradle && \
    echo "org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:MaxDirectMemorySize=512m" >> /root/.gradle/gradle.properties && \
    echo "org.gradle.daemon=false" >> /root/.gradle/gradle.properties && \
    echo "org.gradle.parallel=false" >> /root/.gradle/gradle.properties && \
    echo "org.gradle.workers.max=1" >> /root/.gradle/gradle.properties && \
    echo "org.gradle.caching=true" >> /root/.gradle/gradle.properties && \
    echo "kotlin.incremental=false" >> /root/.gradle/gradle.properties && \
    echo "org.gradle.configureondemand=false" >> /root/.gradle/gradle.properties

# Set working directory
WORKDIR /app

CMD ["/bin/bash"]
