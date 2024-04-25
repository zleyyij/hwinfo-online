# https://stackoverflow.com/questions/2924697/how-does-one-output-bold-text-in-bash
bold=$(tput bold)
normal=$(tput sgr0)

echo "> ${bold}Compiling the parser...${normal}\n"
cd src/scripts/parser/; wasm-pack build --profiling --target web; cd -

echo "> ${bold}Copying essential files to target/...${normal}\n"
mkdir -pv target/scripts/parser/pkg
mkdir -pv target/assets
mkdir -pv target/styles
cp -rv src/index.html target/
cp -rv src/manifest.json target/
cp -rv src/assets/* target/assets/
cp -rv src/styles/* target/styles/
cp -rv src/scripts/*.js target/scripts/
cp -rv src/scripts/lib/ target/scripts/lib/
cp -rv src/scripts/parser/pkg/* target/scripts/parser/pkg/

echo "> ${bold}Build complete, run 'docker build -t arcinc/hwgv .' to build the Docker image.${normal}\n"
