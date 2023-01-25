/*   !!!   Warning generated from mtx source files   !!!   */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <ctype.h>
#include <errno.h>
#include <dirent.h>
#include <libgen.h>

int           processArguments( int argc, const char** argv );
int         canAccessDirectory( const char* baseDir, int force );
int         processSourceFiles( const char* baseDir, int first, int last, const char** files );
int                processFile( const char* baseDir, const char* sourceFile );
int    isPreformattedDelimiter( const char* line );
FILE*                    rejig( FILE* out, const char* baseDir, const char* line );
char*     generateSafeFilepath( const char* basedir, const char* line );
int               doWeTruncate( const char* line );

int                   usage();
int    errorDirectoryExists();

int       createDirectories(       char* safeFilePath );
int        directory_exists( const char* path );
char*       parentDirectory( const char* filepath );
char*              readline( FILE* stream );
char*            stringCopy( const char* aString );
int         stringHasPrefix( const char* aString, const char* prefix );
int          isAlphaNumeric( char ch );

int         FORCE;
int         FIRST;
const char* BASE_DIR;

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

int processFile( const char* baseDir, const char* sourceFile )
{
    int status = 0;
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
            else if ( out )
            {
                fprintf( out, "%s", line );
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

int usage()
{
    const char* ch = "Usage:\n\t quasi [-f] BASE_DIR INPUT_FILES";
    fprintf( stderr, "%s\n", ch );
    return 0;
}

int errorDirectoryExists()
{
    const char* ch = "Error: directory already exists, or cannot be created!";
    fprintf( stderr, "%s\n", ch );
    return 0;
}

int createDirectories( char* dir )
{
    int success = 1;
    if ( ! directory_exists( dir ) )
    {
        if ( createDirectories( parentDirectory( dir ) ) )
        {
            success = ! mkdir( dir, 0755 );
        }
    }
    free( dir );
    return success;
}

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

char* parentDirectory( const char* filepath )
{
    char*  ret = stringCopy( filepath );
    strcpy( ret, dirname( ret ) );
    return ret;
}

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

char* stringCopy( const char* aString )
{
    char* copy = calloc( strlen( aString) + 1, sizeof( char ) );
    strcpy( copy, aString );
    return copy;
}

int stringHasPrefix( const char* aString, const char* prefix )
{
    return (0 < strlen( prefix )) && (aString == strstr( aString, prefix ));
}

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

