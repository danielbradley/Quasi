
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <errno.h>
#include <dirent.h>
#include <libgen.h>

int            checkArgs( int argc, char** argv );
int      createDirectory( int argc, char** argv );
int                usage();
int errorDirectoryExists();

int           processFiles( int argc, char** argv );
int      processSourceFile( const char* basedir, const char* filepath );
char*             readline( FILE* stream );
FILE*                rejig( FILE* out, const char* basedir, const char* line );
char* generateSafeFilepath( const char* basedir, const char* line );
int      createDirectories(       char* safeFilePath );
char*               parent( const char* filepath );

int main( int argc, char** argv )
{
	if ( checkArgs( argc, argv ) ) {
		if ( createDirectory( argc, argv ) ) {
			return !processFiles( argc, argv );
		}
		else {
			return errorDirectoryExists();
		}
	}
	else {
		return usage();
	}
	return 0;
}
int force;

int checkArgs( int argc, char** argv )
{
	int status = 0;
	if ( argc >= 3 )
	{
		force = (0 == strcmp( argv[1], "-f" ));

		status = force ? (argc >= 4) : (argc >= 3);
	}
	return status;	
}

int usage()
{
	const char* ch = "Usage:\n\t semi [-f] BASEDIR INPUT_FILES";
	fprintf( stderr, "%s\n", ch );
	return -1;
}

int createDirectory( int argc, char** argv )
{
	int ret = 1;
	const char* dirname = NULL;

	if ( !force ) {
		dirname = argv[1];
	}
	else {
		dirname = argv[2];
	}

	if ( mkdir( dirname, 0755 ) )
	{
		switch ( errno )
		{
		case EEXIST:
			ret = force;
			break;
		default:
			ret = 0;
		}
	}
	return ret;
}

int errorDirectoryExists()
{
	const char* ch = "Error: directory already exists, or cannot be created!";
	fprintf( stderr, "%s\n", ch );
	return -1;
}

int processFiles( int argc, char** argv )
{
	int status = 1;
	{
		int i = force ? 3 : 2;	// semi -f dir first
		const char* target = force ? argv[2] : argv[1]; 

		for ( i; i < argc; i++ )
		{
			status &= processSourceFile( target, argv[i] );
		}
	}
	return status;
}

int processSourceFile( const char* target, const char* filepath )
{
	fprintf( stdout, "Processing: %s\n", filepath );

	FILE* in   = fopen( filepath, "r" );
	FILE* out  = NULL;

	char* line;
	while ( (line = readline( in )) )
	{
		if ( '~' == line[0] ) {
			out = rejig( out, target, line );
			if ( out ) fprintf( out, "\n", line );
		}
		else if ( out )
		{
			fprintf( out, "%s", line );
		}
	}
	fclose( in );
	fclose( out );

	return (out == NULL);
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

FILE* rejig( FILE* out, const char* basedir, const char* line )
{
	FILE* ret = NULL;

	if ( out )
	{
		fclose( out );
	}
	{
		char* safeFilePath = generateSafeFilepath( basedir, line );
		if ( safeFilePath && createDirectories( parent( safeFilePath ) ) )
		{
			ret = fopen( safeFilePath, "a" );
		}
		free( safeFilePath );
	}

	return ret;
}

char* generateSafeFilepath( const char* basedir, const char* line )
{
	char* full = NULL;
	{
		int len = strlen( basedir ) + strlen( line ) + 2;
		if ( NULL == strstr( line, ".." ) )
		{
			char test[len];
			strcpy( test, line );
			char* token = strtok( test, "~" );
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

		}
	}
	return full;
}

int createDirectories( char* dir )
{
	int success = 1;
	if ( ! directory_exists( dir ) )
	{
		if ( createDirectories( parent( dir ) ) )
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

char* parent( const char* filepath )
{
	char* ret = calloc( strlen( filepath ) + 1, sizeof( char ) );
	{
		strcpy( ret, filepath );
		strcpy( ret, dirname( ret ) );
	}
	return ret;
}
