arch   := $(shell uname)
cpu    := $(shell uname -m)
target := _bin/$(arch)-$(cpu)
web    := web/com.quasi-literateprogramming

version=3.0

all: legacy provisional final

legacy: $(target)/quasi_legacy

$(target)/quasi_legacy:
	mkdir -p $(target)
	gcc -o $(target)/quasi_legacy source/archive/2.0.0/quasi.c

provisional: legacy $(target)/quasi_provisional

$(target)/quasi_provisional:
	mkdir -p _gen/src/provisional
	$(target)/quasi_legacy -f _gen/src/provisional source/mt/*.txt
	gcc -o $(target)/quasi_provisional _gen/src/provisional/c/main.c

final: provisional $(target)/quasi

$(target)/quasi:
	mkdir -p _gen/src/final
	$(target)/quasi_provisional -f _gen/src/final source/mt/*.txt
	gcc -o $(target)/quasi _gen/src/final/c/main.c

website: content download

content:
	rsync -avz $(web)/source/content/*   $(web)/_content
	rsync -avz $(web)/source/resources/* $(web)/_resources
	generate_content.sh $(web)/_content/_index         article source/mt/{10*,20*,30*,X0*}
	generate_content.sh $(web)/_content/implementation article source/mt/{40*,A1*}
	generate_content.sh $(web)/_content/quasi_php      article source/mt/41*
	generate_content.sh $(web)/_content/downloads      article source/mt/50*
	mkdir -p $(web)/_content/source
	echo "<article>"                                                > $(web)/_content/source/article.htm
	echo "<h1>Source: MaxText formatted source documentation</h1>"  >> $(web)/_content/source/article.htm
	echo "<pre>"                                                    >> $(web)/_content/source/article.htm
	cat  source/mt/*.txt | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g'    >> $(web)/_content/source/article.htm
	echo "</pre></article>"                                         >> $(web)/_content/source/article.htm

download:
	mkdir -p source/archive/$(version) $(web)/_resources/downloads/$(version)
	cp _gen/src/final/c/main.c             source/archive/$(version)/quasi.c
	cp _gen/src/final/php/Quasi.php        source/archive/$(version)/quasi.php
	cp source/archive/$(version)/quasi.c   $(web)/_resources/downloads/$(version)/quasi.c
	cp source/archive/$(version)/quasi.php $(web)/_resources/downloads/$(version)/Quasi.php.txt

public: website
	rsync -avz $(web)/_content $(web)/_resources ../../_Public/com.quasi-literateprogramming

clean:
	rm -rf _bin _gen _test
