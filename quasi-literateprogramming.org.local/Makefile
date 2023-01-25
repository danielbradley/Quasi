arch := $(shell uname)
version=2.0

all: legacy provisional final content maxtext download

legacy:
	mkdir -p _gen/libexec/$(arch)
	gcc -o _gen/libexec/$(arch)/quasi_legacy _resources/source/legacy/quasi-2.0.0.c

provisional:
	mkdir -p _gen/src/provisional
	_gen/libexec/$(arch)/quasi_legacy -f _gen/src/provisional _resources/source/mt/*.txt
	gcc -o _gen/libexec/$(arch)/quasi_provisional _gen/src/provisional/c/main.c

final:
	mkdir -p _gen/src/final
	_gen/libexec/$(arch)/quasi_provisional -f _gen/src/final _resources/source/mt/*.txt
	gcc -o _gen/libexec/$(arch)/quasi _gen/src/final/c/main.c

content:
	generate_content.sh _content/_index         article _resources/source/mt/{10*,20*,30*,X0*}
	generate_content.sh _content/implementation article _resources/source/mt/{40*,A1*}
	generate_content.sh _content/quasi_php      article _resources/source/mt/41*
	generate_content.sh _content/downloads      article _resources/source/mt/50*

maxtext:
	mkdir -p _content/source
	echo "<article>"                                                        > _content/source/article.htm
	echo "<h1>Source: MaxText formatted source documentation</h1>"         >> _content/source/article.htm
	echo "<pre>"                                                           >> _content/source/article.htm
	cat _resources/source/mt/*.txt | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g' >> _content/source/article.htm
	echo "</pre></article>"                                                >> _content/source/article.htm

download:
	mkdir -p _resources/downloads/$(version)
	cp _gen/src/final/c/main.c      _resources/downloads/$(version)/quasi.c
	cp _gen/src/final/php/Quasi.php _resources/downloads/$(version)/Quasi.php.txt

public:
	rsync -avz _content _resources ../../../_Public/com.quasi-literateprogramming

clean:
	rm -rf _gen
