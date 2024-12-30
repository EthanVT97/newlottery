-- Create storage bucket for deposit proofs
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true);

-- Create storage policy to allow authenticated uploads
create policy "Allow public access to uploads"
on storage.objects for select
to public
using ( bucket_id = 'uploads' );

create policy "Allow authenticated uploads"
on storage.objects for insert
to public
with check ( bucket_id = 'uploads' );
