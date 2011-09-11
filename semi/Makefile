all: libexec semi doc build

libexec:
	mkdir -p libexec
	gcc -o libexec/semi source/legacy/main.c

semi:
	libexec/semi -f source source/mtx/*.mtx

doc:
	mkdir -p documentation/mtx
	cat source/mtx/*.mtx > documentation/mtx/semi.mtx.txt	

build:
	mkdir -p bin
	gcc -o bin/semi source/c/main.c

clean:
	rm -rf bin libexec source/c
