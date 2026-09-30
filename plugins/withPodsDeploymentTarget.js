/**
 * Xcode 27 rejects pod targets whose IPHONEOS_DEPLOYMENT_TARGET is below 15.0 (Expo SDK 57 itself requires 16.4)
 * (e.g. RNCAsyncStorage and RNSVG resource bundles still declare 12.4/13.4), which
 * fails `pod install` + `xcodebuild` with "deployment target ... is set to 13.4".
 * Raise every pod target that is below the app's minimum to that minimum (16.4, the Expo SDK 57 floor).
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# withPodsDeploymentTarget';

module.exports = function withPodsDeploymentTarget(config, { minimum = '16.4' } = {}) {
  return withDangerousMod(config, [
    'ios',
    async cfg => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        const snippet = [
          `    ${MARKER}`,
          '    installer.pods_project.targets.each do |target|',
          '      target.build_configurations.each do |build_config|',
          "        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
          `        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${minimum}')`,
          `          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minimum}'`,
          '        end',
          '      end',
          '    end',
        ].join('\n');
        const anchor = /post_install do \|installer\|\n/;
        if (!anchor.test(contents)) throw new Error('withPodsDeploymentTarget: post_install hook not found in Podfile');
        contents = contents.replace(anchor, match => `${match}${snippet}\n`);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
