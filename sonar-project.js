const scanner = require('sonarqube-scanner').default;

scanner({
  serverUrl: 'http://localhost:9000',
  options: {
    'sonar.projectKey': 'auth-service-key',
    'sonar.projectName': 'Auth Service',
    'sonar.token': 'sqp_a4f9f0f33f11edb1c43c1a224dca91f5030c6025',
    // Apuntamos a las carpetas raíz del monorepo (Apps y Libs)
    'sonar.sources': 'apps,libs',
    'sonar.tests': 'apps,libs',
    'sonar.test.inclusions': 'apps/**/*.spec.ts,libs/**/*.spec.ts',
    'sonar.typescript.tsconfigPath': 'tsconfig.json',
    'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',

    'sonar.exclusions': '**/node_modules/**,**/dist/**,**/test/**,**/*.dto.ts,**/*.entity.ts,**/*.module.ts,**/main.ts,**/index.ts,**/*.config.ts'
  }
}, () => process.exit());