# TEMPORARY — diagnosing a production WebSocket hang. A raw ASGI app with
# zero Channels machinery (no consumer base class, no channel layer, no
# middleware) to isolate whether the hang is in our code/Channels or in the
# hosting transport itself. Remove once the real hang is fixed.
async def bare_ws_app(scope, receive, send):
	assert scope['type'] == 'websocket'
	event = await receive()
	assert event['type'] == 'websocket.connect'
	await send({'type': 'websocket.accept'})
	await send({'type': 'websocket.close', 'code': 4001})
