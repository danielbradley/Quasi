
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <errno.h>
#include <dirent.h>
#include <libgen.h>

int        processArguments( int argc, const char** argv );
int  canAccessBaseDirectory( const char* baseDir, int forced );
int      processSourceFiles( const char* baseDir, int first, int last, const char** files );
FILE*                 rejig( FILE* out, const char* baseDir, const char* line );
char*  generateSafeFilepath( const char* basedir, const char* line );
int            doWeTruncate( const char* line );

int                   usage();
int    errorDirectoryExists();

int       createDirectories(       char* safeFilePath );
int         directoryExists( const char* path );
char*       parentDirectory( const char* filepath );
char*              readline( FILE* stream );
char*            stringCopy( const char* aString );

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

	if ( mkdir( baseDir, 0755 ) )
	{
		switch ( errno )
		{
		case EEXIST:
			status = force;
			break;
		default:
			status = 1;
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
			if ( '~' == line[0] ) {
				out = rejig( out, baseDir, line );
				if ( out ) fprintf( out, "\n", line );
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


char* generateSafeFilepath( const char* basedir, const char* line )
{
	char* full = NULL;
	{
		int len = strlen( basedir ) + strlen( line ) + 1;
		if ( NULL == strstr( line, ".." ) )
		{
			char* test  = stringCopy( line );	
			char* token = strtok( test, "~" );

			if ( token && ('!' == token[0]) ) token++;

			if ( token && isalnum( token[0] ) )
			{
				full = calloc( len, sizeof( char ) );
				strcpy( full, basedir );
				strcat( full, "/" );
				strcat( full, token );

				if ( NULL == strtok( NULL, "~" ) )
				{
					free( full );
					full = NULL;
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
	if ( 2 < strlen( line ) )
	{
		truncate = ('!' == line[1]);
	}
	return truncate;
}

int usage()
{
	const char* ch = "Usage:\n\t semi [-f] BASE_DIR INPUT_FILES";
	fprintf( stderr, "%s\n", ch );
	return -1;
}

int errorDirectoryExists()
{
	const char* ch = "Error: directory already exists, or cannot be created!";
	fprintf( stderr, "%s\n", ch );
	return -1;
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
	char* ret = calloc( strlen( filepath ) + 1, sizeof( char ) );
	{
		strcpy( ret, filepath );
		strcpy( ret, dirname( ret ) );
	}
	return ret;
}

char* readline( FILE* stream )
{
	int  n = 0;
	char ch[2] = { 0, 0 };
	char* line = calloc( 1024, sizeof( char ) );

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
				read = 0;
				break;
			default:
				line[n++] = *ch;
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
