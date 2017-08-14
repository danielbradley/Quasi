all: libexec quasi content

# build

libexec:
	mkdir -p _gen/libexec
	gcc -o _gen/libexec/quasi _resources/source/legacy/quasi-2.0.0.c

quasi:
	_gen/libexec/quasi -f _resources/source _resources/source/mt/*.txt

content:
	generate_content.sh _index         article _resources/source/mt/{10*,20*,30*,X0*}
	generate_content.sh implementation article _resources/source/mt/{40*,A1*}
	generate_content.sh download       article _resources/source/mt/50*

build:
	mkdir -p _resources/bin
	gcc -o _resources/bin/quasi _resources/source/c/main.c

clean:
	rm -rf _gen
