# https://stackoverflow.com/questions/2924697/how-does-one-output-bold-text-in-bash
bold=$(tput bold)
normal=$(tput sgr0)

echo "> ${bold}Compiling the parser...${normal}"
cd src/scripts/parser/; wasm-pack build --target web; cd -

echo "> ${bold}Copying essential files to target/...${normal}"
mkdir target/
cp -rv src/index.html target/
cp -rv src/styles/ target/
cp -rv src/assets/ target/
mkdir -p target/scripts/parser/pkg/
cp -rv src/scripts/*.js target/scripts/
cp -rv src/scripts/lib/ target/scripts/lib/
cp -rv src/scripts/parser/pkg/* target/scripts/parser/pkg/

echo "> ${bold} Starting Docker build...${normal}"
docker build -t arcinc/hwgv .