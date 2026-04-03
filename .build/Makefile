.PHONY: all unpack packed windows windows-unpack macos macos-unpack linux linux-unpack install

NWJS_VERSION := 0.110.1

all: packed
unpack: windows-unpack macos-unpack linux-unpack
packed: windows macos linux

# RESOURCES
install:
	apt install -y wget ca-certificates unzip zip tar icoutils icnsutils nsis sed file chromium

windows/nwjs.zip:
	wget -nv -O $@ https://dl.nwjs.io/v$(NWJS_VERSION)/nwjs-v$(NWJS_VERSION)-win-x64.zip

windows/icon.ico:
	icotool -o $@ -c ../favicon.png

macos/nwjs.zip:
	wget -nv -O $@ https://dl.nwjs.io/v$(NWJS_VERSION)/nwjs-v$(NWJS_VERSION)-osx-arm64.zip

macos/icon.icns:
	png2icns $@ ../favicon.png

linux/appimage:
	wget -nv -O $@ https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-$$(arch).AppImage && \
	chmod 755 $@

linux/nwjs.tar.gz:
	wget -nv -O $@ https://dl.nwjs.io/v$(NWJS_VERSION)/nwjs-v$(NWJS_VERSION)-linux-x64.tar.gz

# WINDOWS
windows/.unpack: windows/nwjs.zip windows/icon.ico
	cd windows && \
	rm -rf Web-NXDT/ && \
	unzip -q nwjs.zip && \
	mv nwjs-*/ Web-NXDT/ && \
	cd Web-NXDT/ && \
	mkdir -p package.nw/ && \
	cp ../../package.json ../../../favicon.png package.nw/ && \
	touch ../.unpack

windows/Web-NXDT.exe: windows/.unpack
	cd windows && \
	./makensis && \
	chmod 755 Web-NXDT.exe

windows-unpack: windows/.unpack
windows: windows/Web-NXDT.exe

# MACOS
macos/.unpack: macos/nwjs.zip macos/icon.icns
	cd macos && \
	rm -rf Web-NXDT/ && \
	unzip -q nwjs.zip && \
	mv nwjs-*/nwjs.app/ Web-NXDT.app/ && \
	rm -r nwjs-*/ && \
	cd Web-NXDT.app/ && \
	mkdir -p Contents/Resources/app.nw/ && \
	cp ../../package.json ../../../favicon.png Contents/Resources/app.nw/ && \
	sed -i 's|>nwjs<|>Web-NXDT<|' Contents/Info.plist && \
	mv Contents/MacOS/nwjs Contents/MacOS/Web-NXDT && \
	cp ../icon.icns Contents/Resources/app.icns && \
	touch ../.unpack

macos/Web-NXDT.app.zip: macos/.unpack
	cd macos && \
	zip -qyr Web-NXDT.app.zip Web-NXDT.app

macos-unpack: macos/.unpack
macos: macos/Web-NXDT.app.zip

# LINUX
linux/.unpack: linux/nwjs.tar.gz
	cd linux && \
	rm -rf Web-NXDT/ && \
	tar -xaf nwjs.tar.gz && \
	mv nwjs-*/ Web-NXDT/ && \
	cd Web-NXDT/ && \
	mkdir -p package.nw/ && \
	cp ../../package.json ../../../favicon.png package.nw/ && \
	ln -s nw AppRun && \
	ln -s package.nw/favicon.png icon.png && \
	cp ../web-nxdt.desktop ./ && \
	touch ../.unpack

linux/Web-NXDT.AppImage: linux/.unpack linux/appimage
	cd linux && \
	./appimage --appimage-extract-and-run Web-NXDT Web-NXDT.AppImage

linux-unpack: linux/.unpack
linux: linux/Web-NXDT.AppImage