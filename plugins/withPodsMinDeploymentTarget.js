// Xcode 27 부터 iOS 15.0 미만 배포 대상을 지원하지 않아, 낮은 값을 선언한 Pod
// (Sentry, lottie, RNSVG, ReachabilitySwift 의 리소스 번들 등)이 빌드를 막는다.
// ios/ 는 prebuild 로 다시 만들어지므로 Podfile 을 직접 고치지 않고
// post_install 에서 Pod 타깃의 배포 대상을 앱 배포 대상까지 올리는 코드를 넣는다.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '# @generated twowo-min-deployment-target';

const SNIPPET = `
    ${MARKER}
    min_ios_target = podfile_properties['ios.deploymentTarget'] || '16.4'
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        next if current.nil?
        if Gem::Version.new(current) < Gem::Version.new(min_ios_target)
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios_target
        end
      end
    end`;

function addMinDeploymentTarget(podfile) {
  if (podfile.includes(MARKER)) return podfile;
  const rnPostInstall = /(react_native_post_install\([\s\S]*?\n\s*\))/;
  if (!rnPostInstall.test(podfile)) {
    throw new Error('withPodsMinDeploymentTarget: Podfile 에서 react_native_post_install 호출을 찾지 못했습니다.');
  }
  return podfile.replace(rnPostInstall, `$1\n${SNIPPET}`);
}

module.exports = function withPodsMinDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');
      fs.writeFileSync(podfilePath, addMinDeploymentTarget(podfile));
      return cfg;
    },
  ]);
};

module.exports.addMinDeploymentTarget = addMinDeploymentTarget;
