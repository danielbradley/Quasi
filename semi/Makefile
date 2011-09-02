all: dirs legacy src build

dirs:
	mkdir -p bin
	mkdir -p libexec

legacy:
	gcc -o libexec/semi source/legacy/main.c

src:
	rm -rf source/c
	libexec/semi -f source source/mtx/*.mtx

build:
	gcc -o bin/semi source/c/main.c

clean:
	rm -rf bin libexec source/c
