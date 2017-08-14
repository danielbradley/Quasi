all: libexec quasi doc build

libexec:
	mkdir -p libexec
	gcc -o libexec/quasi source/legacy/main.c

quasi:
	libexec/quasi -f source source/mtx/*.mtx

doc:
	mkdir -p documentation/mtx
	cat source/mtx/*.mtx > documentation/mtx/quasi.mtx.txt	

build:
	mkdir -p bin
	gcc -o bin/quasi source/c/main.c

clean:
	rm -rf bin libexec source/c web
