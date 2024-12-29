import { Language, LanguageConfig } from "../types";

const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  py: {
    extension: "py",
    fileName: "main.py",
    runCommand: "/usr/bin/python3 main.py",
    opts: "",
  },
  js: {
    extension: "js",
    fileName: "main.js",
    runCommand: "/usr/bin/node main.js",
    opts: "",
  },
  java: {
    extension: "java",
    fileName: "main.java",
    compileCommand: "/usr/bin/javac main.java",
    runCommand: "/usr/bin/java main",
    opts: "--dir=/etc/alternatives=/etc/alternatives --dir=/etc/java-21-openjdk/security=/etc/java-21-openjdk/security",
  },
  cpp: {
    extension: "cpp",
    fileName: "main.cpp",
    compileCommand: "/usr/bin/g++ -o program main.cpp",
    runCommand: "./program",
    opts: "",
  },
};

export default LANGUAGE_CONFIGS;
