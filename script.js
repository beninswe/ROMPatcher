;(async () => {
	let convert_ips_to_json = async ( ips ) => {
		let content = new Uint8Array( await new Response( ips ).arrayBuffer() )
		//                  P     A     T     C     H
		let patch_check = [0x50, 0x41, 0x54, 0x43, 0x48, 0].reduce( (a, n, i) => { return a && n == content[i] })

		if ( !patch_check ) {
			return false
		} 
		let readposition = 6 // start after the patch text

		let patch = {}
		while ( readposition < content.length ) {
			let eof_check = [ 0x45, 0x4F, 0x46 ].reduce( (a, n, i) => { return a && n == content[readposition + (i - 1) ] } )
			if ( eof_check ) break
			let address = new Uint16Array( content.slice( readposition, readposition + 2 ).reverse().buffer )[0]
			readposition += 2
			let size = new Uint16Array( content.slice( readposition, readposition + 2 ).reverse().buffer )[0]
			readposition += 2

			patch[address] = content.slice( readposition, readposition + size )
			readposition += size +1
		}
		return patch
	}

	let read_patch = async ( patchfile ) => {
		// return the patch in a format we can enumerate
		let content
		if ( patchfile.name.match(/\.ips$/) ) {
			content = convert_ips_to_json( patchfile )
		} else if ( patchfile.name.match(/\.json$/) ) {
			content = await new Response( patchfile ).json()
		}

		return content
	}
	let url = new URL(document.location)

	let urlpatch = url.searchParams.get('patch') 

	if ( urlpatch ) {
		document.querySelector('#patchfile').classList.add('hidden')
		document.querySelector('.patchurl').textContent = urlpatch
	}

	document.querySelector('#patch').addEventListener('click', async (e) => {
		let patch
		if ( urlpatch )  {
			patch = await fetch( urlpatch ).then( r => r.json() )
		} else { 
			patch = await read_patch( [...document.querySelector('#patchfile').files][0] )
		}
		let rom = [...document.querySelector('#romfile').files][0]
		let patchedrom = new Uint8Array( await new Response( rom ).arrayBuffer() )

		Object.keys(patch).forEach( ( pos ) => {
			patchedrom.set( patch[pos].map( e => +e ), pos )
		} )

		var output = new FileReader()
		output.onload = function(e) {
			const link = document.querySelector( 'a.patchedrom' )
			link.href = output.result
			const patchedname = rom.name.replace( /(\.[A-z0-9]+)/, '_patched$1' )
			link.setAttribute( 'download', patchedname )
			link.textContent = patchedname

		}
		output.readAsDataURL(new Blob( [ patchedrom ], { type: 'application/octet-stream' } ) )
	})


	debugger
})()