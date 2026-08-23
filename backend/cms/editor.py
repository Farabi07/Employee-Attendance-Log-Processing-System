	with connection.cursor() as cursor:
		cursor.execute('''
			select
			json_object_agg(
				head,
				case
				when array_length(image,1)=1 then to_json(image[1])
				else to_json(image)
				end)
			from (
			select head, array_agg(image) as image
			from cms_cmsmenucontentimage where cms_menu_id=%s
			group by head) as x;
						''', [menu_id])
		row = cursor.fetchone()
		print('row: ', row)
		print('row type: ', type(row))
	my_data = row[0]