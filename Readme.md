
#	Quasi - a tool for quasi-literate programming
##  Daniel Bradley

[crossadaptive.com](https://crossadaptive.com)

###   Front Matter

####	Copyright

Copyright 2011-2025, Daniel Robert Bradley.

####	Last updated

8 May 20205

####	License

This software is released under the terms of the [GPLv3](License-GPLv3.txt).

####	Disclaimer

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


###   Introduction

Donald Knuth coined the term "literate programming" to refer to a programming approach whereby a programmer develops a program "in the order demanded by logic and flow of their thoughts" [Wikipedia].
Rather than produce source code that is /commented/ with textual descriptions, a textual description is produced that describes the structure and semantics of code /chunks/ embedded within the prose.

Tools can then be used to produce reader friendly documentation /woven/ from the source, as well as an executable/compilable /tangled/ form.
Knuth's original tool was called "Web" [Web], however other tools have since been developed that are language-agnostic [Noweb].

The following code fragment from the /literate programming/ Wikipedia page demonstrates how the "web" system works [Wikipedia].
The text '<<Scan File>>=' defines a /macro/ that is associated with the code that follows it.

```
    <<Scan file>>=
    while (1) {
        <<Fill buffer if it is empty; break at end of file>>
        c = *ptr++;
        if ( c > ' ' && c < 0177 ) {
            /* visible ASCII codes */
            if ( !in_word) {
                word_count++;
                in_word = 1;
            }
            continue;
        }
        if ( c == '\n' ) line_count++;
        else if ( c != ' ' && c != '\t') continue;
        in_word = 0;
            /* c is newline, space, or tab */
    }
    @
```

The macro '<<Scan File>>' could then be used in any other code /chunk/.

A problem with such an approach is the possibility that while a reader may think they fully understand the code they are reading, it is possible that they do not notice a specific interaction between various code chucks.
It would be necessary for the reader to reference the /tangled/ code in order to be sure they are properly understanding interactions within the system.

A related problem is that there are no limitation on how macros are used, allowing code to be intermixed in arbitrary ways.
Software developed using the system may become increasingly hard to maintain as others are forced edit the source files.

This document describes Quasi, a tool for quasi-literate programming.
It has been developed in the spirit of Knuth's literate programming but, by providing a far less powerful tool, it also simplifies the process from the perspective of a maintenance programmer.

###	Background

While this tool was inspired by literate programming, it is derived from an earlier tool called "extract" that is used for extracting SQL definitions from web-application requirements documents for use in database initialisation scripts.
The tool would scan text files and extract the text of pre-formatted sections that matched a user supplied pattern.

For example, this command would extract the following block of SQL:
```
    extract -p "users_table" source_file.txt >> output_file.sql
```

```
    ~users_table~
    CREATE TABLE users
    (
    USER        INT(11)  NOT NULL AUTO_INCREMENT
    PRIMARY KEY (USER)
    );
    ~
``` 

This allowed the definitions of SQL tables and SQL Stored Procedures to be directly developed and documented within a requirements document.
This provided the motivation for developing a similar tool to also extract source code from documentation.


###	Concept

Similar to "extract", "quasi" extracts sections of pre-formatted text from documentation and appends it to /target/ text files.
Unlike "extract", rather than matching a supplied pattern, the /identifier/ in the pre-formatted text section is used as the file path of the target file relative to a user supplied base directory.

For example, this command would extract the following block of source code and append it to the file 'source/c/quasi.c':
```
    quasi source source/mtx/quasi.mtx
```

```
    ~c/quasi.c~
    int main( int argc, char** argv )
    {
        return 0;
    }
    ~
```

The tool does sanitation of the filenames, ensuring that parent directory ('..') commands aren't included and therefore that output files remain under the specified base directory.
If the specified base directory already exists the tool will exit with an error, unless the '-f' flag is passed as the first command argument.
```
    quasi -f source source/mtx/quasi.mtx
```

If the identifier of the pre-formatted block section is prefixed by an exclamation mark the file is truncated on opening.
It is advisable that when a file is truncated in this manner that the code fragment be a comment warning that the file is generated:
```
    ~!c/quasi.c~
    /*   !!!   Warning this file is auto-generated   !!!   */
    ~
```

Quasi is implemented to process text files that use the MaxText text format [MaxText].
If code fragments are not appropriate for the output documentation they can be commented using the standard MaxText commenting character, causing them to be ignored by MaxText, but still be processed by Quasi.
This is useful for hiding code comments, or perhaps includes.
```
    !
    Include various standard includes.

    ~!c/quasi.c!~
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>
    ~
    !
```

The key difference between literate programming tools and Quasi is that Quasi forces the programmer to construct all target source files in a linear fashion, however, separate files may still be constructed in parallel.
It is thought that an additional benefit of this approach is that it will enable programmers to better modularise their software, as there is very little overhead in creating new files.

### Implementation

Quasi has now been reimplemented in pure C to maximise portability, allowing it to act as the foundation of an organisation's development tool set.

```!c/main.c~
/*   !!!   Warning generated from mtx source files   !!!   */
```


####		Invocation

To ensure simplicity of implementation, Quasi is invoked with a simple command-line.

```
    quasi [-f] BASE_DIR INPUT_FILES...
```

The /BASE DIR/ argument specifies the directory that target files are created relative to -- if the /BASE DIR/ already exists, Quasi exits returning an error, unless the '-f' flag is passed as the first argument.
After the /BASE DIR/, one or more input files are specified for parsing.

####		Overview

The following custom types are used:

```c/main.c~
typedef int bool;
```

The function declarations below show the overall structure of Quasi.
First the arguments are processed (processArguments) and, if valid, the base directory is verified (canAccessBaseDirectory) and created, if needed.
Each of the command-line arguments corresponding to the source files are then processed (processSourceFile).
During processing, the output files are opened and closed (rejig) as necessary.
Each time a target file is created the filename must be appropriately sanitised (generateSafeFilepath) and it must be determined whether to truncate the file or not (doWeTruncate).

```c/main.c~
int           processArguments( int argc, const char** argv );
int         canAccessDirectory( const char* baseDir, int force );
int         processSourceFiles( const char* baseDir, int first, int last, const char** files );
int                processFile( const char* baseDir, const char* sourceFile );
int    isPreformattedDelimiter( const char* line );
FILE*                    rejig( FILE* out, const char* baseDir, const char* line );
char*     generateSafeFilepath( const char* basedir, const char* line );
int               doWeTruncate( const char* line );
bool           isQuasiDownload( const char* line );
void   downloadAndProcessQuasi( const char* basedir, const char* line );
char*       createDownloadPath( const char* basedir );
char*     createDependencyPath( const char* basedir );
char*        downloadQuasiFile( const char* line );
```

If inappropriate arguments are passed, Quasi prints a usage message (usage) and exits with an error.
Similarly, if the /base dir/ directory already exists, Quasi prints an error message (*errorDirectoryExists*) and exists with an error.

```c/main.c~
int                   usage();
int    errorDirectoryExists();
```

The following utility functions are also used (these are described in the appendix).

```c/main.c~
int       createDirectories(       char* safeFilePath );
int        directory_exists( const char* path );
char*       parentDirectory( const char* filepath );
void  printCurrentDirectory();
char*              readline( FILE* stream );
char*             stringCat( const char* aString, const char* separatorString, const char* anotherString );
char*            stringCopy( const char* aString );
int         stringHasPrefix( const char* aString, const char* prefix );
int         stringHasSuffix( const char* aString, const char* suffix );
char*            stringTrim( const char* aString );
int          isAlphaNumeric( char ch );
```

During argument processing, the following global variables are initialised.
/FORCE/ is initialised as true (1) if the '-f' flag was passed; FIRST is initialised to indicate the first source file argument in /argv/; and /BASE_DIR/ is initialised to the base directory argument.

```c/main.c~
int         FORCE;
int         FIRST;
const char* BASE_DIR;
```

The main function calls the appropriate functions as needed.

```c/main.c~
int main( int argc, const char** argv )
{
    int status = 0;

    if ( processArguments( argc, argv ) )
    {
        if ( canAccessDirectory( BASE_DIR, FORCE ) )
        {
            int last = argc - 1;
            status = processSourceFiles( BASE_DIR, FIRST, last, argv );
        }
        else
        {
            status = errorDirectoryExists();
        }
    }
    else
    {
        status = usage();
    }
    return !status;
}
```

####		Argument processing

If the minimum expected number of arguments is supplied, the arguments are processed.
If the force argument is supplied, the global variable /FORCE/ is set to true (1);
then the global variable /BASE_DIR/ is initialised to the next argument.
Finally, if there is at least one file argument remaining, the global variable /FIRST/ is initialised to identify it and the function returns true (1).

```c/main.c~
int processArguments( int argc, const char** argv )
{
    int status             = 0;
    int expected_arguments = 3;
    int i                  = 1;

    if ( argc >= expected_arguments )
    {
        if ( 0 == strcmp( argv[i], "-f" ) )
        {
            expected_arguments++;
            i++;
            FORCE = 1;
        }
        BASE_DIR = argv[i]; i++;
        FIRST    = i;
        status   = ( argc >= expected_arguments );
    }
    return status;	
}
```


####		Accessing the base directory

First, an attempt is made to create the base directory.
True (1) is returned if this succeeds, or if the directory already existed and /FORCE/ is true.
Otherwise, the method returns false (0).

```c/main.c~
int canAccessDirectory( const char* baseDir, int force )
{
    int status = 0;

    if ( 0 == mkdir( baseDir, 0755 ) )
    {
        status = 1;
    }
    else
    {
        switch ( errno )
        {
        case EEXIST:
            status = force;
            break;
        }
    }
    return status;
}
```

####		Processing the source files

For each source file, the *processFile* function is called passing the /baseDir/ and the /source file/.

```c/main.c~
int processSourceFiles( const char* baseDir, int first, int last, const char** files )
{
    int status = 1;
    int i;
    for ( i=first; i <= last; i++ )
    {
        status &= processFile( baseDir, files[i] );
    }
    return status;
}
```

#####			Processing a file

This procedure processes an individual source file.
The file stream *in* is opened for the duration of the procedure, while the *out* file stream is only opened during the processing of a pre-formatted text block.

The procedure reads lines from the *in* stream using the "readline" procedure.
When a tilde (~) character is encountered, the system either opens, or closes, *out* by calling the "rejig" function, which rejigs the *out* stream.
Each time a stream is closed a blank line is printed to the stream -- this allows the source to have spaces between chunks, while not having kludge whitespace in pre-formatted text blocks.

When a tilde character doesn't start the line and the *out* stream is an open (not NULL) stream, the line is written out to the stream.

If the /out/ file stream is not null when the loop exists it indicates that the previous pre-formatted block wasn't closed properly.
This causes a warning message to be printed to /stderr/ and the function returns false (0).

```c/main.c~
int processFile( const char* baseDir, const char* sourceFile )
{
    int status = 0;
    int in_bib = 0;

    fprintf( stdout, "Processing: %s\n", sourceFile );

    FILE* in = fopen( sourceFile, "r" );
    if ( in )
    {
        FILE* out = NULL;

        char* line;
        while ( (line = readline( in )) )
        {
            if ( isPreformattedDelimiter( line ) )
            {
                if ( out )
                {
                    fprintf( out, "\n" );
                }
                out = rejig( out, baseDir, line );
            }
            else
            if ( out )
            {
                fprintf( out, "%s", line );
            }
            else
            if ( !in_bib && stringHasPrefix( line, "[" ) )
            {
                in_bib = 1;
            }
            else
            if ( in_bib && isQuasiDownload( line ) )
            {
                downloadAndProcessQuasi( baseDir, line );
            }
        }
        fclose( in );

        if ( out )
        {
            fclose( out );
            fprintf( stderr, "Warning: %s is unmatched '~'\n", sourceFile );
        }
        status = (out == NULL);
    }

    return status;
}
```

#####         Is preformatted delimiter

A line is considered a delimiter for a section of pre-formatted text
if it begins with either:
a tilde character ('~') - the delimiter of MaxText formatted files;
or a triplet of back-tick characters ("```") - the delimiter for Markdown files.

```c/main.c~
int isPreformattedDelimiter( const char* line )
{
    switch( line[0] )
    {
    case '~':
        return 1;

    default:
        return stringHasPrefix( line, "```" );
    }
}
```

#####			Rejig file output

This function closes /out/, then if the passed line contains a valid file name, opens and returns a new file stream.
First, if "generateSafeFilepath" indicates a valid file name, any necessary directories are created, then the file is either opened or created.
If "doWeTruncate" returns true, the file is truncated on open.

```c/main.c~
FILE* rejig( FILE* out, const char* basedir, const char* line )
{
    FILE* ret = NULL;

    if ( out ) fclose( out );

    char* safeFilePath = generateSafeFilepath( basedir, line );
    if ( safeFilePath && createDirectories( parentDirectory( safeFilePath ) ) )
    {
        if ( doWeTruncate( line ) )
        {
            ret = fopen( safeFilePath, "w" );
        }
        else
        {
            ret = fopen( safeFilePath, "a" );
        }
    }
    free( safeFilePath );

    return ret;
}
```

#####			Generation of the safe filepath

The "generateSafeFilepath" procedure attempts to produce a safe file path by combining the passed base-dir with a file path extracted from the passed line.
The passed line starts with a tilde character but may have anything else as well.

First, the line is checked to make sure it doesn't include '..', which could potentially reference a directory above the /base dir/.
Next, the line is checked to ensure it includes a period, '.', either indicating a relative directory path, or the beginning of a file type suffix -- this is to avoid MaxText pre-formatted text tags.
Then, 'strtok' is used to tokenise the line using the tilde as a delimiter.
The first token returned is treated as the filepath -- first it is checked to make sure it is alpha-numerical chacter (indicating an appropraite filename),
then strtok is called again to verify that the token is trailed by another tilde if the file is in MaxText format.
Note, Markdown pre-formatted delimiters do not have a trailing delimiter,
therefore, when parsing Markdown files, the newline character is also passed as a delimiter.

If there are any problems NULL is returned.

```c/main.c~
typedef enum _Format { MARKDOWN, MAXTEXT } Format;

char* generateSafeFilepath( const char* basedir, const char* line )
{
    char* full = NULL;
    int   last = 0;

    Format format = ('~' == line[0]) ? MAXTEXT : MARKDOWN;

    int len = strlen( basedir ) + strlen( line ) + 1;
    if ( NULL == strstr( line, ".." ) )
    {
        if ( NULL != strstr( line, "." ) )
        {
            char* test  = stringCopy( line );	
            char* token = ('~' == line[0]) ? strtok( test, "~" ) : strtok( test, "`\n" );

            if ( token && ('!' == token[0]) ) token++;

            if ( token && isAlphaNumeric( token[0] ) )
            {
                full = calloc( len, sizeof( char ) );
                strcpy( full, basedir );
                strcat( full, "/" );
                strcat( full, token );

                switch ( format )
                {
                case MARKDOWN:
                    // Markdown does not require end delimiter,
                    // which seems to cause a trailing '?' to be added to the token...
                    last = strlen( full ) - 2;

                    if ( '?' == full[last] )
                    {
                        full[last] = '\0';
                    }
                    break;

                case MAXTEXT:
                    if ( NULL == strtok( NULL, "~" ) )
                    {
                        free( full );
                        full = NULL;
                    }
                    break;
                }
            }
            free( test );
        }
    }



    return full;
}
```

#####			Truncation

The output file is truncated on open if the source file name is proceeded by an exclamation mark.

```c/main.c~
int doWeTruncate( const char* line )
{
    int truncate = 0;

    switch( line[0] )
    {
    case '~':
        if ( 2 < strlen( line ) )
        {
            truncate = ('!' == line[1]);
        }
        break;

    case '`':
        if ( 4 < strlen( line ) )
        {
            truncate = ('!' == line[3]);
        }
        break;
    }
    return truncate;
}
```

##### Is Quasi Download

```c/main.c~
bool isQuasiDownload( const char* line )
{
    bool is_download = 0;

    char* trimmed = stringTrim( line );
    {
        is_download = stringHasPrefix( trimmed, "http" ) && stringHasSuffix( trimmed, ".txt" );
    }
    free( trimmed );

    if ( is_download )
        fprintf( stderr, "-- [%s]\n", trimmed );

    return is_download;
}
```

##### Download and Process Quasi

```c/main.c~
void downloadAndProcessQuasi( const char* basedir, const char* line )
{
    char* current = getcwd( NULL, 0 );
    {
        if ( !createDirectories( createDownloadPath( basedir ) ) )
        {
            fprintf( stderr, "!! [%s]\n", "Could not create downloads directory." );
        }
        else
        if ( !createDirectories( createDependencyPath( basedir ) ) )
        {
            fprintf( stderr, "!! [%s]\n", "Could not create dependency directory." );
        }
        else
        {
            char* download_path = createDownloadPath( basedir );

            if ( chdir( download_path ) )
            {
                perror( "Could not change to downloads directory." );
                fprintf( stderr, "!! [%s]\n", download_path );
                exit( -1 );
            }
            else
            {
                char* dependency_path    = createDependencyPath( basedir );
                char* download_file_path = downloadQuasiFile( line );

                //
                //  Crucial to return to original working directory
                //  before calling 'processFile'.
                //

                if ( chdir( current ) )
                {
                    perror( "Could not change back to original directory." );
                    exit( -1 );
                }

                processFile( dependency_path, download_file_path );

                free( dependency_path    );
                free( download_file_path );
            }
            free( download_path );
        }
    }

    free( current );
}
```

##### Create Download Path

```c/main.c~
char* createDownloadPath( const char* basedir )
{
    const char* downloads_dir = "_downloads";

    return stringCat( basedir, "/", downloads_dir );
}
```

##### Create Dependency Path

```c/main.c~
char* createDependencyPath( const char* basedir )
{
    const char* dependency_dir = "_dep";

    return stringCat( basedir, "/", dependency_dir );
}
```

##### Download Quasi File

```c/main.c~
char* downloadQuasiFile( const char* line )
{
    char* download_file_path = 0;
    {
        char* current  = getcwd    ( NULL,             0 );
        char* url      = stringTrim( line                );
        char* command1 = stringCat ( "wget",    " ", url );
        char* command2 = stringCat ( "curl -O", " ", url );
        {
            if ( system( command1 ) && system( command2 ) )
            {
                fprintf( stderr, "!! [%s]\n", "Could not call wget or curl" );
            }
            else
            {
                download_file_path = stringCat( current, "/", basename( url ) );
            }
        }
        free( current  );
        free( url      );
        free( command1 );
        free( command2 );
    }
    return download_file_path;
}
```

####		Error messages

#####			Incorrect arguments

If the program is invoked without the appropriate arguments the following usage message is printed to /stderr/.
```
Usage:
    quasi [-f] BASE_DIR INPUT_FILES
```

```c/main.c~
int usage()
{
    const char* ch = "Usage:\n\t quasi [-f] BASE_DIR INPUT_FILES";
    fprintf( stderr, "%s\n", ch );
    return 0;
}
```

#####			Directory already exists

If the force ('-f') flag hasn't been passed, and the base directory already exists, the following error message is printed to /stderr/.
```
    Error: directory already exists, or cannot be created!
```

```c/main.c~
int errorDirectoryExists()
{
    const char* ch = "Error: directory already exists, or cannot be created!";
    fprintf( stderr, "%s\n", ch );
    return 0;
}
```

#### Quasi.PHP

Quasi.PHP is an implementation of Quasi that is used for preprocessing text files into served Javascript and
CSS files.
In contrast to the command-line version of Quasi,
this version does not write files to disk but rather creates a string for each file,
which is then returned in an associative array to the caller.
Also, the names of the files to be processed are passed as an array.

For example:

```
$files  = QuasiFilesMatching( ".txt" ); // e.g., ["0-Frontmatter.txt", "1-Overview.txt", "2-Body.txt"]
$output = Quasi( $files, ".js" );       // Only return Javascript files

foreach ( $output as $path => $string )
{
    echo $string
}
```


```php/Quasi.php~
function Quasi( $files, $suffix = "" )
{
    $output = array();

    foreach ( $files as $filepath )
    {
        Process( $output, $filepath, $suffix );
    }

    return $output;
}

function Process( &$output, $filepath, $suffix )
{
    $content = file_get_contents( $filepath );
    $lines   = explode( "\n", $content );
    $inside  = false;
    $file    = "";
    $linenum = 0;

    foreach ( $lines as $line )
    {
        $linenum++;

        if ( 0 < strlen( $line ) && ("~" == $line[0]) )
        {
            $inside = ! $inside;

            if ( ! $inside )
            {
                $file = "";
            }
            else
            {
                $provisional = substr( $line, 1, -1 );

                if ( QuasiEndsWith( $provisional, $suffix ) )
                {
                    $file = $provisional;

                    if ( ! array_key_exists( $file, $output ) ) $output[$file] = "";

                    $output[$file] .= "\n" . "/* Generated from $filepath:$linenum using Quasi.php */" . "\n\n";
                }
            }
        }
        else
        if ( $inside && ("" != $file) )
        {
            $output[$file] .= $line . "\n";
        }
    }
}

//
//  Helper functions
//

function QuasiFilesMatching( $suffix )
{
    $files = array();
    $list = scandir( "." );

    foreach ( $list as $index => $file )
    {
        if ( QuasiEndsWith( $file, $suffix ) )
        {
            $files[] = $file;
        }
    }
    return $files;
}

function QuasiEndsWith( $file, $suffix )
{
    $length = strlen($suffix);

    return $length === 0 || (substr($file, -$length) === $suffix);
}

function QuasiCreateVariablesDictionary( $filename )
{
    $dict                = array();
    $variables_file_path = dirname( __FILE__ ) . "/" . $filename;

    if ( file_exists( $variables_file_path ) )
    {
        $contents = file_get_contents( $variables_file_path );

        $lines = explode( "\n", $contents );

        foreach ( $lines as $line )
        {
            $trimmed = trim( $line );

            if ( 0 === strpos( $trimmed, '--' ) )
            {
                if ( defined( "QUASI_DEBUG" ) && QUASI_DEBUG ) error_log( $trimmed );
                $bits = explode( ":", $trimmed );
                if ( defined( "QUASI_DEBUG" ) && QUASI_DEBUG ) error_log( var_export( $bits, true ) );

                if ( 1 < count( $bits ) )
                {
                    $name  = trim( $bits[0] );
                    $value = trim( $bits[1] );
                    $value = trim( str_replace( ';', '', $value ) );

                    $key   = "var($name)";

                    if ( defined( "QUASI_DEBUG" ) && QUASI_DEBUG ) error_log( "dict[$key] = $value" );

                    $dict[$key] = $value . " /* $name */";
                }
            }
        }
    }
    return $dict;
}

function QuasiRetrieveCSS( $filename )
{
    $contents      = FALSE;
    $css_file_path = dirname( __FILE__ ) . "/" . $filename;

    if ( file_exists( $css_file_path ) )
    {
        $contents = file_get_contents( $css_file_path );
    }

    return $contents;
}

function QuasiReplace( $content, $array )
{
    foreach ( $array as $key => $value )
    {
        $content = str_replace( $key, $value, $content );
    }

    return $content;
}
```

### Downloads

#### Command-line

Distribution packages will be released soon.
For now, simply invoke the following on your command line after downloading the '.c' file;
then copy the resulting executable 'quasi' to a directory on your path.

```
cc -o quasi quasi-2.0.c
```


#### Quasi.php

Download the Quasi.php file and place it in your PHP includes directory,
or directly in your styles directory.
Usaged is shown below.

```
$files  = QuasiFilesMatching( ".txt" ); // e.g., ["0-Frontmatter.txt", "1-Overview.txt", "2-Body.txt"]
$output = Quasi( $files, ".js" );       // Only return Javascript files

foreach ( $output as $path => $string )
{
    echo $string
}
```


###	Future Work

In the future, other open source projects, including MaxText and Build, will be rewritten using Quasi and released.

####	Appendix A

Quasi uses the following generic auxiliary functions.

#####	Create directories

This is a recursive procedure that finds the first existing directory, then unwinds creating the necessary directories.

```c/main.c~
int createDirectories( char* dir )
{
    int success = 1;
    if ( ! directory_exists( dir ) )
    {
        if ( createDirectories( parentDirectory( dir ) ) )
        {
            if ( mkdir( dir, 0755 ) )
            {
                perror( "Could not create target directory" );
                success = 0;
            }
        }
    }
    free( dir );
    return success;
}
```

#####	Directory exists

A simple procedure that determines whether a directory exists or not.

```c/main.c~
int directory_exists( const char* path )
{
    int status = 0;
    DIR* dir = opendir( path );
    if ( dir )
    {
        closedir( dir );
        status = 1;
    }
    return status;
}
```

#####	Parent directory

A simple wrapper around "dirname" that allocates and returns a string.
Note: due to /dirname/ returning its own storage, can't just call:
```
    return stringcopy( dirname( filepath ) );
```

```c/main.c~
char* parentDirectory( const char* filepath )
{
    char*  ret = stringCopy( filepath );
    strcpy( ret, dirname( ret ) );
    return ret;
}
```

##### Print current directory

```c/main.c~
void printCurrentDirectory()
{
    char* cwd = getcwd( NULL, 0 );
    fprintf( stderr, "-- [CWD: %s]\n", cwd );
    free( cwd );
}
```

##### Read line

The "readline" procedure reads individual characters into a character buffer --
each character is appended to the char string "line".
When a newline character is encountered "line" is returned.
When the stream is empty a NULL is returned.

If the line is longer than 1023 characters the buffer "line" is doubled in size using "realloc".

Easier to implement this, than worry about portability.
From memory, the POSIX function is implemented differently on different systems.

```c/main.c~
char* readline( FILE* stream )
{
    int  n     = 0;
    int  sz    = 1024;
    char ch[2] = { 0, 0 };
    char* line = calloc( sz, sizeof( char ) );

    int read;
    do
    {
        read = fread( ch, sizeof(char), 1, stream );
        if ( read )
        {
            switch ( *ch )
            {
            case '\n':
                line[n++] = *ch;
                line[n]   = '\0';
                read      = 0;
                break;
            default:
                line[n++] = *ch;
                line[n]   = '\0';
            }

            if ( n == sz )
            {
                sz  *= 2;
                line = realloc( line, sz );
            }
        }
        
    }
    while ( 0 != read );

    if ( 0 == n )
    {
        free( line );
        line = NULL;
    }

    return line;
}
```

##### String cat

Returns a copy of the passed strings separated by 'sep'.

```c/main.c~
char* stringCat( const char* aString, const char* separatorString, const char* anotherString )
{
    int len1 = strlen( aString         );
    int len2 = strlen( separatorString );
    int len3 = strlen( anotherString   );
    int len4 = len1 + len2 + len3 + 1;

    char* ret = calloc( len4, sizeof( char ) );

    strcat( ret, aString         );
    strcat( ret, separatorString );
    strcat( ret, anotherString   );

    return ret;
}
```

##### String copy

Returns a copy of the passed string.

```c/main.c~
char* stringCopy( const char* aString )
{
    char* copy = calloc( strlen( aString) + 1, sizeof( char ) );
    strcpy( copy, aString );
    return copy;
}
```

##### String has prefix

```c/main.c~
int stringHasPrefix( const char* aString, const char* prefix )
{
    return (0 < strlen( prefix )) && (aString == strstr( aString, prefix ));
}
```

##### String has suffix

```c/main.c~
int stringHasSuffix( const char* aString, const char* suffix )
{
    int len1 = strlen( suffix );

    if ( 0 == len1 )
    {
        return 0;
    }
    else
    {
        int len2 = strlen( aString );

        if ( len1 > len2 )
        {
            return 0;
        }
        else
        {
            const char* _suffix = &(suffix [len1]);
            const char* _string = &(aString[len2]);

            //  "Some string with a suffix"
            //                     "suffix"
            //                            ^
            //                           ^
            //                          ^
            //                         ^
            //                        ^
            //                       ^

            do
            {
                _suffix--;
                _string--;

                if ( _suffix == suffix )
                {
                    return (*_suffix == *_string);
                }
            }
            while ( *_suffix == *_string );

            return 0;
        }
    }
}
```

##### String Trim

Takes a copy of the string (

```c/main.c~
char* stringTrim( const char* aString )
{
    char* ret  = stringCopy( aString );
    char* copy = stringCopy( aString );
    {
        int   len        = strlen( copy );
        char* start      = copy;
        char* end        = &(copy[len]);
        int   trim_start = 1;
        int   trim_end   = 1;

        //  First increment pointer 'start' until
        //  a non-whitespace character is encountered.

        //   01234567890123
        //  "   A String   "
        //   ^
        //      ^

        do
        {
            switch( (char) *start )
            {
            case  ' ':
            case '\n':
            case '\t':
                start++;
                break;

            case '\0':
            default:
                trim_start = 0;
                break;
            }

        } while ( trim_start );

        //  Then decrement pointer 'end' until
        //  a non-whitespace character is encountered.

        //   01234567890123
        //  "   A String   "
        //                 ^
        //             ^

        do
        {
            switch( *end )
            {
            case '\0':
            case  ' ':
            case '\n':
            case '\t':
                end--;
                break;

            default:
                trim_end = 0;
                break;
            }

            if ( start == end ) trim_end = 0;

        } while ( trim_end );

        //  Then increment pointer 'end' one
        //  and set string terminator character.

        //   01234567890123
        //  "   A String   "
        //      ^      ^
        //      ^       ^
        //  "   A String"

        ++end;
        *end = '\0';

        //  Use 'strcpy' to copy string from 'start' to new termination
        //  point into 'ret', which is guarenteed to be
        //  at least as long as substring.

        strcpy( ret, start );
    }
    free( copy );

    return ret;
}
```

##### Is AlphaNumeric

```c/main.c~
int isAlphaNumeric( char ch )
{
    switch ( ch )
    {
    case '_':
        return 1;

    default:
        return isalnum( (unsigned char) ch );
    }
}
```

###	Bibliography

[Wikipedia]	Wikipedia: literate programming.
        http://en.wikipedia.org/wiki/Literate_programming

[Web]		The CWEB System of Structured Documentation
        http://www-cs-faculty.stanford.edu/~uno/cweb.html

[Noweb]		Noweb - A Simple, Extensible Tool for Literate Programming
        http://www.cs.tufts.edu/~nr/noweb/

[MaxText]	MaxText will be released publicly soon.
