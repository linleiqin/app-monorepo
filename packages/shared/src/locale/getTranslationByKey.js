#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to get translation mappings for a specific ETranslations key
 * Usage: node getTranslationByKey.js <ETranslations_key>
 * Example: node getTranslationByKey.js Limit_expire_day
 * Example: node getTranslationByKey.js Limit.expire_day
 */

// Available language files
const LANGUAGE_FILES = [
  'bn.json',
  'de.json',
  'en_US.json',
  'es.json',
  'fr_FR.json',
  'hi_IN.json',
  'id.json',
  'it_IT.json',
  'ja_JP.json',
  'ko_KR.json',
  'pt_BR.json',
  'pt.json',
  'ru.json',
  'th_TH.json',
  'uk_UA.json',
  'vi.json',
  'zh_CN.json',
  'zh_HK.json',
  'zh_TW.json',
];

function getLanguageCode(filename) {
  return filename.replace('.json', '');
}

function loadTranslationFile(languageFile) {
  const filePath = path.join(__dirname, 'json', languageFile);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${languageFile}:`, error);
    return {};
  }
}

function loadETranslationsEnum() {
  const enumPath = path.join(__dirname, 'enum', 'translations.ts');
  try {
    const content = fs.readFileSync(enumPath, 'utf-8');

    // Extract enum values using regex
    const enumMatches = content.match(/(\w+)\s*=\s*'([^']+)'/g);
    const enumMap = {};

    if (enumMatches) {
      enumMatches.forEach((match) => {
        const [, key, value] = match.match(/(\w+)\s*=\s*'([^']+)'/);
        enumMap[key] = value;
      });
    }

    return enumMap;
  } catch (error) {
    console.error('Error loading ETranslations enum:', error);
    return {};
  }
}

function getTranslationByKey(translationKey) {
  const result = {};
  const translations = {};

  // Load all language files and extract the specific key
  for (const languageFile of LANGUAGE_FILES) {
    const languageCode = getLanguageCode(languageFile);
    const translationsData = loadTranslationFile(languageFile);

    if (translationsData[translationKey]) {
      translations[languageCode] = translationsData[translationKey];
    }
  }

  result[translationKey] = translations;
  return result;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node getTranslationByKey.js <ETranslations_key>');
    console.error('Example: node getTranslationByKey.js Limit_expire_day');
    console.error('Example: node getTranslationByKey.js Limit.expire_day');
    process.exit(1);
  }

  const inputKey = args[0];

  // Load ETranslations enum mapping
  const enumMap = loadETranslationsEnum();

  let translationKey = inputKey;
  let keyExists = false;

  // Check if input is an ETranslations enum key
  if (enumMap[inputKey]) {
    translationKey = enumMap[inputKey];
    keyExists = true;
  } else {
    // Check if input is already a translation key
    for (const languageFile of LANGUAGE_FILES) {
      const translationsData = loadTranslationFile(languageFile);
      if (translationsData[inputKey]) {
        keyExists = true;
        break;
      }
    }
  }

  if (!keyExists) {
    console.error(
      `Error: "${inputKey}" is not found in ETranslations enum or translation files.`,
    );
    console.error('Make sure you are using a valid ETranslations key.');

    // Show some examples
    const enumKeys = Object.keys(enumMap);
    if (enumKeys.length > 0) {
      console.error(
        'Available ETranslations keys include:',
        enumKeys.slice(0, 5).join(', '),
        '...',
      );
    }
    process.exit(1);
  }

  try {
    const result = getTranslationByKey(translationKey);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { getTranslationByKey };
