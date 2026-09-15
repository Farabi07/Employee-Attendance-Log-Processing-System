# TEMPORARY — diagnosing a production WebSocket hang. A raw ASGI app with
# zero Channels machinery (no consumer base class, no channel layer, no
# middleware) to isolate whether the hang is in our code/Channels or in the
# hosting transport itself. Remove once the real hang is fixed.
async def bare_ws_app(scope, receive, send):
	assert scope['type'] == 'websocket'
	event = await receive()
	assert event['type'] == 'websocket.connect'
	await send({'type': 'websocket.accept'})
	# Send an ordinary text frame BEFORE closing — isolates whether it's
	# specifically the close frame that never reaches the client, or every
	# frame after accept().
	await send({'type': 'websocket.send', 'text': 'hello-from-bare-app'})
	await send({'type': 'websocket.close', 'code': 4001})
